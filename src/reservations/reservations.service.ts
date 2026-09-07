import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { TenantService } from '../common/services/tenant.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReservationDto } from './dto/reservation.dto';
@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
    private readonly audit: AuditService,
  ) {}
  async list(user: AuthenticatedUser) {
    const complexId = this.tenant.requireComplexId(user);
    return this.prisma.reservation.findMany({
      where:
        user.role === Role.RESIDENT
          ? { complexId, resident: { userId: user.id } }
          : { complexId },
      include: {
        parkingSpace: true,
        resident: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { startDateTime: 'desc' },
    });
  }
  async create(dto: CreateReservationDto, user: AuthenticatedUser) {
    const complexId = this.tenant.requireComplexId(user);
    const [start, end] = [new Date(dto.startDateTime), new Date(dto.endDateTime)];
    if (start < new Date() || end <= start)
      throw new BadRequestException('El rango de reserva no es válido');
    const [resident, space, setting] = await Promise.all([
      this.prisma.resident.findFirst({
        where: { userId: user.id, complexId, status: 'ACTIVE' },
      }),
      this.prisma.parkingSpace.findFirst({
        where: { id: dto.parkingSpaceId, complexId },
      }),
      this.prisma.complexSetting.findUnique({ where: { complexId } }),
    ]);
    if (!resident) throw new NotFoundException('Perfil de residente no encontrado');
    if (!space || !['COMMUNAL', 'TEMPORARY'].includes(space.type))
      throw new BadRequestException('El parqueadero no permite reservas');
    if (!setting?.reservationsEnabled)
      throw new ForbiddenException('Las reservas están deshabilitadas para el conjunto');
    if ((end.getTime() - start.getTime()) / 3_600_000 > setting.maxReservationHours)
      throw new BadRequestException('La reserva excede la duración máxima permitida');
    const conflict = await this.prisma.reservation.findFirst({
      where: {
        parkingSpaceId: space.id,
        status: { in: ['PENDING', 'CONFIRMED', 'ACTIVE'] },
        startDateTime: { lt: end },
        endDateTime: { gt: start },
      },
    });
    if (conflict) throw new ConflictException('Ya existe una reserva en ese horario');
    const row = await this.prisma.reservation.create({
      data: {
        complexId,
        parkingSpaceId: space.id,
        residentId: resident.id,
        startDateTime: start,
        endDateTime: end,
        status: 'CONFIRMED',
      },
      include: { parkingSpace: true },
    });
    await this.audit.record(
      user,
      'Reservation created',
      'Reservation',
      row.id,
      undefined,
      { parkingSpaceId: space.id },
    );
    return row;
  }
  async cancel(id: string, user: AuthenticatedUser) {
    const complexId = this.tenant.requireComplexId(user);
    const reservation = await this.prisma.reservation.findFirst({
      where: { id, complexId },
      include: { resident: true },
    });
    if (!reservation) throw new NotFoundException('Reserva no encontrada');
    if (user.role === Role.RESIDENT && reservation.resident.userId !== user.id)
      throw new ForbiddenException('Solo puedes cancelar tus reservas');
    if (!['PENDING', 'CONFIRMED'].includes(reservation.status))
      throw new BadRequestException('Esta reserva no puede cancelarse');
    const row = await this.prisma.reservation.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
    await this.audit.record(user, 'Reservation cancelled', 'Reservation', id);
    return row;
  }
}
