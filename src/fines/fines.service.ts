import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { TenantService } from '../common/services/tenant.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFineDto, UpdateFineDto } from './dto/fine.dto';
@Injectable()
export class FinesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
    private readonly audit: AuditService,
  ) {}
  list(user: AuthenticatedUser) {
    const complexId = this.tenant.requireComplexId(user);
    return this.prisma.fine.findMany({
      where:
        user.role === Role.RESIDENT
          ? { complexId, resident: { userId: user.id } }
          : { complexId },
      include: {
        resident: { include: { user: { select: { firstName: true, lastName: true } } } },
        apartment: true,
      },
      orderBy: { issuedAt: 'desc' },
    });
  }
  async create(dto: CreateFineDto, user: AuthenticatedUser) {
    const complexId = this.tenant.requireComplexId(user);
    const resident = await this.prisma.resident.findFirst({
      where: { id: dto.residentId, complexId },
    });
    if (!resident) throw new NotFoundException('Residente no encontrado');
    const row = await this.prisma.fine.create({
      data: {
        complexId,
        residentId: resident.id,
        apartmentId: resident.apartmentId,
        reason: dto.reason,
        amount: dto.amount,
        dueDate: new Date(dto.dueDate),
        createdById: user.id,
      },
    });
    await this.audit.record(user, 'Fine created', 'Fine', row.id, undefined, {
      amount: dto.amount,
    });
    return row;
  }
  async update(id: string, dto: UpdateFineDto, user: AuthenticatedUser) {
    const row = await this.prisma.fine.findFirst({
      where: { id, complexId: this.tenant.requireComplexId(user) },
    });
    if (!row) throw new NotFoundException('Multa no encontrada');
    const updated = await this.prisma.fine.update({
      where: { id },
      data: {
        reason: dto.reason,
        amount: dto.amount,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        status: dto.status,
      },
    });
    await this.audit.record(user, 'Fine updated', 'Fine', id);
    return updated;
  }
}
