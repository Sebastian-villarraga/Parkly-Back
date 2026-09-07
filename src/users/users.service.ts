import { ConflictException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { TenantService } from '../common/services/tenant.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSecurityUserDto } from './dto/security-user.dto';
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
    private readonly audit: AuditService,
  ) {}
  listSecurity(user: AuthenticatedUser) {
    return this.prisma.user.findMany({
      where: { complexId: this.tenant.requireComplexId(user), role: 'SECURITY' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        status: true,
        createdAt: true,
      },
    });
  }
  async createSecurity(dto: CreateSecurityUserDto, actor: AuthenticatedUser) {
    if (await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } }))
      throw new ConflictException('El correo ya está registrado');
    const row = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash: await bcrypt.hash(dto.password, 12),
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: Role.SECURITY,
        complexId: this.tenant.requireComplexId(actor),
      },
    });
    await this.audit.record(actor, 'Security user created', 'User', row.id, undefined, {
      role: row.role,
    });
    const safeUser = Object.fromEntries(
      Object.entries(row).filter(([key]) => key !== 'passwordHash'),
    ) as Omit<typeof row, 'passwordHash'>;
    return safeUser;
  }
}
