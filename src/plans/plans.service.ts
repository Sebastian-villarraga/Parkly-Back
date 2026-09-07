import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanDto, UpdatePlanDto } from './dto/plan.dto';
@Injectable()
export class PlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}
  list() {
    return this.prisma.plan.findMany({ orderBy: { monthlyPrice: 'asc' } });
  }
  async create(dto: CreatePlanDto, user: AuthenticatedUser) {
    try {
      const row = await this.prisma.plan.create({ data: dto });
      await this.audit.record(user, 'Plan created', 'Plan', row.id, undefined, {
        name: row.name,
      });
      return row;
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002')
        throw new ConflictException('Ya existe un plan con este nombre');
      throw e;
    }
  }
  async update(id: string, dto: UpdatePlanDto, user: AuthenticatedUser) {
    const old = await this.prisma.plan.findUnique({ where: { id } });
    if (!old) throw new NotFoundException('Plan no encontrado');
    const row = await this.prisma.plan.update({ where: { id }, data: dto });
    await this.audit.record(user, 'Plan updated', 'Plan', id);
    return row;
  }
}
