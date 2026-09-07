import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriptionDto, UpdateSubscriptionDto } from './dto/subscription.dto';
@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}
  list() {
    return this.prisma.subscription.findMany({
      include: { complex: true, plan: true },
      orderBy: { createdAt: 'desc' },
    });
  }
  async create(dto: CreateSubscriptionDto, user: AuthenticatedUser) {
    const [complex, plan] = await Promise.all([
      this.prisma.complex.findUnique({ where: { id: dto.complexId } }),
      this.prisma.plan.findUnique({ where: { id: dto.planId } }),
    ]);
    if (!complex || !plan) throw new NotFoundException('Conjunto o plan no encontrado');
    if (!plan.active) throw new BadRequestException('El plan está inactivo');
    const row = await this.prisma.subscription.create({
      data: {
        complexId: dto.complexId,
        planId: dto.planId,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        nextBillingDate: new Date(dto.nextBillingDate),
        minimumCommitmentMonths: dto.minimumCommitmentMonths ?? 6,
      },
      include: { complex: true, plan: true },
    });
    await this.audit.record(
      user,
      'Subscription created',
      'Subscription',
      row.id,
      undefined,
      { complexId: dto.complexId, planId: dto.planId },
    );
    return row;
  }
  async update(id: string, dto: UpdateSubscriptionDto, user: AuthenticatedUser) {
    const old = await this.prisma.subscription.findUnique({ where: { id } });
    if (!old) throw new NotFoundException('Suscripción no encontrada');
    if (dto.planId && !(await this.prisma.plan.findUnique({ where: { id: dto.planId } })))
      throw new NotFoundException('Plan no encontrado');
    const row = await this.prisma.subscription.update({
      where: { id },
      data: {
        planId: dto.planId,
        status: dto.status,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        nextBillingDate: dto.nextBillingDate ? new Date(dto.nextBillingDate) : undefined,
        minimumCommitmentMonths: dto.minimumCommitmentMonths,
      },
      include: { complex: true, plan: true },
    });
    await this.audit.record(user, 'Subscription updated', 'Subscription', id);
    return row;
  }
}
