import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { TenantService } from '../common/services/tenant.service';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccessEventDto, CreateIncidentDto } from './dto/access-event.dto';
@Injectable()
export class AccessControlService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
    private readonly audit: AuditService,
  ) {}
  list(user: AuthenticatedUser) {
    return this.prisma.accessEvent.findMany({
      where: { complexId: this.tenant.requireComplexId(user) },
      include: {
        vehicle: true,
        visitorAuthorization: { include: { visitor: true } },
        registeredBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { timestamp: 'desc' },
    });
  }
  async create(dto: CreateAccessEventDto, user: AuthenticatedUser) {
    const complexId = this.tenant.requireComplexId(user);
    const vehicleType = dto.type.startsWith('VEHICLE');
    const visitorType = dto.type.startsWith('VISITOR');
    if (
      vehicleType === visitorType ||
      (vehicleType && !dto.vehicleId) ||
      (visitorType && !dto.visitorAuthorizationId)
    )
      throw new BadRequestException(
        'El tipo de evento no corresponde al recurso indicado',
      );
    if (dto.vehicleId) {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: { id: dto.vehicleId, complexId, status: 'ACTIVE' },
      });
      if (!vehicle) throw new NotFoundException('Vehículo no encontrado');
    }
    if (dto.visitorAuthorizationId) {
      const authorization = await this.prisma.visitorAuthorization.findFirst({
        where: { id: dto.visitorAuthorizationId, complexId },
      });
      if (!authorization) throw new NotFoundException('Autorización no encontrada');
      if (
        dto.type === 'VISITOR_ENTRY' &&
        (authorization.status !== 'AUTHORIZED' ||
          authorization.validUntil < new Date() ||
          authorization.validFrom > new Date())
      )
        throw new BadRequestException('La autorización de visitante no está vigente');
      if (dto.type === 'VISITOR_EXIT' && authorization.status !== 'INSIDE')
        throw new BadRequestException('El visitante no se encuentra registrado dentro');
    }
    const row = await this.prisma.$transaction(async (tx) => {
      const event = await tx.accessEvent.create({
        data: {
          complexId,
          vehicleId: dto.vehicleId,
          visitorAuthorizationId: dto.visitorAuthorizationId,
          type: dto.type,
          notes: dto.notes,
          registeredById: user.id,
        },
      });
      if (dto.visitorAuthorizationId)
        await tx.visitorAuthorization.update({
          where: { id: dto.visitorAuthorizationId },
          data: { status: dto.type === 'VISITOR_ENTRY' ? 'INSIDE' : 'EXITED' },
        });
      return event;
    });
    await this.audit.record(
      user,
      `${dto.type} registered`,
      'AccessEvent',
      row.id,
      undefined,
      { type: dto.type },
    );
    return row;
  }
  async reportIncident(dto: CreateIncidentDto, user: AuthenticatedUser) {
    const row = await this.prisma.incident.create({
      data: {
        complexId: this.tenant.requireComplexId(user),
        reportedById: user.id,
        ...dto,
      },
    });
    await this.audit.record(user, 'Incident reported', 'Incident', row.id);
    return row;
  }
}
