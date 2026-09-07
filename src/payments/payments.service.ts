import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { TenantService } from '../common/services/tenant.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChargeDto, CreatePaymentDto } from './dto/payment.dto';
@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
    private readonly audit: AuditService,
  ) {}
  charges(user: AuthenticatedUser) {
    const complexId = this.tenant.requireComplexId(user);
    return this.prisma.charge.findMany({
      where:
        user.role === Role.RESIDENT
          ? { complexId, resident: { userId: user.id } }
          : { complexId },
      include: {
        resident: { include: { user: { select: { firstName: true, lastName: true } } } },
        payments: true,
      },
      orderBy: { dueDate: 'desc' },
    });
  }
  payments(user: AuthenticatedUser) {
    const complexId = this.tenant.requireComplexId(user);
    return this.prisma.payment.findMany({
      where:
        user.role === Role.RESIDENT
          ? { resident: { userId: user.id, complexId } }
          : { charge: { complexId } },
      include: {
        charge: true,
        resident: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { paymentDate: 'desc' },
    });
  }
  async createCharge(dto: CreateChargeDto, user: AuthenticatedUser) {
    const complexId = this.tenant.requireComplexId(user);
    const resident = await this.prisma.resident.findFirst({
      where: { id: dto.residentId, complexId },
    });
    if (!resident) throw new NotFoundException('Residente no encontrado');
    const row = await this.prisma.charge.create({
      data: {
        complexId,
        residentId: resident.id,
        concept: dto.concept,
        amount: dto.amount,
        dueDate: new Date(dto.dueDate),
      },
    });
    await this.audit.record(user, 'Charge created', 'Charge', row.id, undefined, {
      amount: dto.amount,
    });
    return row;
  }
  async createPayment(dto: CreatePaymentDto, user: AuthenticatedUser) {
    const complexId = this.tenant.requireComplexId(user);
    const charge = await this.prisma.charge.findFirst({
      where: { id: dto.chargeId, complexId, status: 'PENDING' },
      include: { resident: true },
    });
    if (!charge) throw new NotFoundException('Cobro pendiente no encontrado');
    if (user.role === Role.RESIDENT && charge.resident.userId !== user.id)
      throw new ForbiddenException('Solo puedes pagar tus propios cobros');
    if (dto.amount > Number(charge.amount))
      throw new BadRequestException('El monto no puede exceder el cobro pendiente');
    const row = await this.prisma.payment.create({
      data: {
        chargeId: charge.id,
        residentId: charge.residentId,
        amount: dto.amount,
        method: dto.method,
        reference: dto.reference,
        status: 'PENDING',
      },
    });
    await this.audit.record(
      user,
      'Simulated payment created',
      'Payment',
      row.id,
      undefined,
      { amount: dto.amount },
    );
    return row;
  }
  async confirmPayment(id: string, user: AuthenticatedUser) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, charge: { complexId: this.tenant.requireComplexId(user) } },
      include: { charge: { include: { payments: { where: { status: 'CONFIRMED' } } } } },
    });
    if (!payment) throw new NotFoundException('Pago no encontrado');
    if (payment.status !== 'PENDING')
      throw new BadRequestException('El pago no está pendiente');
    const paidBefore = payment.charge.payments.reduce(
      (sum, entry) => sum + Number(entry.amount),
      0,
    );
    const status =
      paidBefore + Number(payment.amount) >= Number(payment.charge.amount)
        ? 'PAID'
        : 'PENDING';
    const row = await this.prisma.$transaction(async (tx) => {
      const confirmed = await tx.payment.update({
        where: { id },
        data: { status: 'CONFIRMED', paymentDate: new Date() },
      });
      if (status === 'PAID')
        await tx.charge.update({
          where: { id: payment.chargeId },
          data: { status: 'PAID' },
        });
      return confirmed;
    });
    await this.audit.record(user, 'Simulated payment confirmed', 'Payment', id);
    return row;
  }
}
