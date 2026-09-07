import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { TenantService } from '../common/services/tenant.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
  ) {}
  async parkingOccupancy(user: AuthenticatedUser) {
    const complexId = this.tenant.requireComplexId(user);
    const [byStatus, total] = await Promise.all([
      this.prisma.parkingSpace.groupBy({
        by: ['status'],
        where: { complexId },
        _count: { _all: true },
      }),
      this.prisma.parkingSpace.count({ where: { complexId } }),
    ]);
    return { total, byStatus };
  }
  async access(user: AuthenticatedUser) {
    const complexId = this.tenant.requireComplexId(user);
    const [byType, recent, vehiclesInside] = await Promise.all([
      this.prisma.accessEvent.groupBy({
        by: ['type'],
        where: { complexId },
        _count: { _all: true },
      }),
      this.prisma.accessEvent.findMany({
        where: { complexId },
        include: { vehicle: true, visitorAuthorization: { include: { visitor: true } } },
        orderBy: { timestamp: 'desc' },
        take: 50,
      }),
      this.prisma.accessEvent.count({ where: { complexId, type: 'VEHICLE_ENTRY' } }),
    ]);
    return { byType, vehiclesInsideEstimate: vehiclesInside, recent };
  }
  fines(user: AuthenticatedUser) {
    return this.prisma.fine.groupBy({
      by: ['status'],
      where: { complexId: this.tenant.requireComplexId(user) },
      _count: { _all: true },
      _sum: { amount: true },
    });
  }
  payments(user: AuthenticatedUser) {
    return this.prisma.payment.groupBy({
      by: ['status'],
      where: { charge: { complexId: this.tenant.requireComplexId(user) } },
      _count: { _all: true },
      _sum: { amount: true },
    });
  }
  reservations(user: AuthenticatedUser) {
    return this.prisma.reservation.groupBy({
      by: ['status'],
      where: { complexId: this.tenant.requireComplexId(user) },
      _count: { _all: true },
    });
  }
  assignments(user: AuthenticatedUser) {
    return this.prisma.parkingAssignment.groupBy({
      by: ['status', 'type'],
      where: { complexId: this.tenant.requireComplexId(user) },
      _count: { _all: true },
    });
  }
}
