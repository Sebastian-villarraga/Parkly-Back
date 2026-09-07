import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateComplexAdminDto } from './dto/create-complex-admin.dto';
import {
  CreateComplexDto,
  UpdateComplexDto,
  UpdateComplexStatusDto,
} from './dto/complex.dto';

@Injectable()
export class ComplexesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}
  list() {
    return this.prisma.complex.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { apartments: true, users: true, parkingSpaces: true } },
        subscriptions: { where: { status: 'ACTIVE' }, include: { plan: true }, take: 1 },
      },
    });
  }
  async find(id: string) {
    const found = await this.prisma.complex.findUnique({
      where: { id },
      include: {
        settings: true,
        subscriptions: { include: { plan: true }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!found) throw new NotFoundException('Conjunto no encontrado');
    return found;
  }
  async create(dto: CreateComplexDto, actor: AuthenticatedUser) {
    const complex = await this.prisma.complex.create({
      data: { ...dto, settings: { create: {} } },
    });
    await this.audit.record(actor, 'Complex created', 'Complex', complex.id, undefined, {
      name: complex.name,
    });
    return complex;
  }
  async update(id: string, dto: UpdateComplexDto, actor: AuthenticatedUser) {
    const old = await this.find(id);
    const updated = await this.prisma.complex.update({ where: { id }, data: dto });
    await this.audit.record(
      actor,
      'Complex updated',
      'Complex',
      id,
      { name: old.name },
      { name: updated.name },
    );
    return updated;
  }
  async updateStatus(id: string, dto: UpdateComplexStatusDto, actor: AuthenticatedUser) {
    await this.find(id);
    const updated = await this.prisma.complex.update({ where: { id }, data: dto });
    await this.audit.record(actor, 'Complex status updated', 'Complex', id, undefined, {
      status: dto.status,
    });
    return updated;
  }
  async createAdmin(
    complexId: string,
    dto: CreateComplexAdminDto,
    actor: AuthenticatedUser,
  ) {
    await this.find(complexId);
    if (await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } }))
      throw new ConflictException('El correo ya está registrado');
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash: await bcrypt.hash(dto.password, 12),
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: Role.ADMIN,
        complexId,
      },
    });
    await this.audit.record(
      actor,
      'Complex administrator created',
      'User',
      user.id,
      undefined,
      { complexId, role: Role.ADMIN },
    );
    const safeUser = Object.fromEntries(
      Object.entries(user).filter(([key]) => key !== 'passwordHash'),
    ) as Omit<typeof user, 'passwordHash'>;
    return safeUser;
  }
}
