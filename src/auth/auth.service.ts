import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ComplexStatus, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const publicUser = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  complexId: true,
  status: true,
} as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { complex: true },
    });
    if (
      !user ||
      user.status !== UserStatus.ACTIVE ||
      (user.complex && user.complex.status !== ComplexStatus.ACTIVE)
    ) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    if (!(await bcrypt.compare(dto.password, user.passwordHash)))
      throw new UnauthorizedException('Credenciales inválidas');
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    const tokens = await this.issueTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      complexId: user.complexId,
    });
    return {
      ...tokens,
      user: this.withoutPassword(user),
      role: user.role,
      complexId: user.complexId,
    };
  }

  async refresh(token: string) {
    let payload: {
      sub: string;
      email: string;
      role: AuthenticatedUser['role'];
      complexId: string | null;
    };
    try {
      payload = await this.jwt.verifyAsync(token, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido o vencido');
    }
    const tokenHash = this.hash(token);
    const stored = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        userId: payload.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!stored) throw new UnauthorizedException('Refresh token revocado o vencido');
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { ...publicUser, passwordHash: true },
    });
    if (!user || user.status !== UserStatus.ACTIVE)
      throw new UnauthorizedException('La cuenta no está disponible');
    return this.issueTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      complexId: user.complexId,
    });
  }

  async logout(token: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hash(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(user: AuthenticatedUser) {
    const found = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: publicUser,
    });
    if (!found) throw new UnauthorizedException();
    return found;
  }

  async forgotPassword(
    dto: ForgotPasswordDto,
  ): Promise<{ message: string; resetToken?: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user)
      return { message: 'Si el correo existe, recibirás instrucciones de recuperación.' };
    const rawToken = randomBytes(32).toString('hex');
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hash(rawToken),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    // La entrega por correo se conectará aquí; en desarrollo se expone únicamente para pruebas locales.
    return {
      message:
        'Token de recuperación generado. Configure un proveedor de correo para entrega.',
      ...(process.env.NODE_ENV !== 'production' ? { resetToken: rawToken } : {}),
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const record = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash: this.hash(dto.token),
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!record)
      throw new BadRequestException('Token de recuperación inválido o vencido');
    const passwordHash = await bcrypt.hash(dto.password, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  private async issueTokens(user: AuthenticatedUser) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      complexId: user.complexId,
    };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_SECRET'),
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN', '15m'),
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    });
    const decoded = this.jwt.decode(refreshToken) as { exp?: number } | null;
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hash(refreshToken),
        expiresAt: new Date((decoded?.exp ?? 0) * 1000),
      },
    });
    return { accessToken, refreshToken };
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
  private withoutPassword<T extends { passwordHash: string }>(
    user: T,
  ): Omit<T, 'passwordHash'> {
    const safeUser = { ...user } as Omit<T, 'passwordHash'> & { passwordHash?: string };
    delete safeUser.passwordHash;
    return safeUser as Omit<T, 'passwordHash'>;
  }
}
