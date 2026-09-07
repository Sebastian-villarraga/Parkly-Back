import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { TenantService } from '../common/services/tenant.service';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssignmentDto } from './dto/assignment.dto';
@Injectable()
export class AssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
    private readonly audit: AuditService,
  ) {}
  list(user: AuthenticatedUser) {
    return this.prisma.parkingAssignment.findMany({
      where: { complexId: this.tenant.requireComplexId(user) },
      include: {
        parkingSpace: true,
        apartment: true,
        resident: { include: { user: { select: { firstName: true, lastName: true } } } },
        vehicle: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  async create(dto: CreateAssignmentDto, user: AuthenticatedUser) {
    const complexId = this.tenant.requireComplexId(user);
    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (endDate && endDate <= startDate)
      throw new BadRequestException('La fecha final debe ser posterior a la inicial');
    const [space, apartment, resident, vehicle] = await Promise.all([
      this.prisma.parkingSpace.findFirst({
        where: { id: dto.parkingSpaceId, complexId },
      }),
      dto.apartmentId
        ? this.prisma.apartment.findFirst({ where: { id: dto.apartmentId, complexId } })
        : null,
      dto.residentId
        ? this.prisma.resident.findFirst({ where: { id: dto.residentId, complexId } })
        : null,
      dto.vehicleId
        ? this.prisma.vehicle.findFirst({ where: { id: dto.vehicleId, complexId } })
        : null,
    ]);
    if (!space) throw new NotFoundException('Parqueadero no encontrado');
    if (
      (dto.apartmentId && !apartment) ||
      (dto.residentId && !resident) ||
      (dto.vehicleId && !vehicle)
    )
      throw new NotFoundException('Una relación no pertenece al conjunto');
    const conflict = await this.prisma.parkingAssignment.findFirst({
      where: {
        parkingSpaceId: dto.parkingSpaceId,
        status: 'ACTIVE',
        startDate: { lte: endDate ?? new Date('9999-12-31') },
        OR: [{ endDate: null }, { endDate: { gte: startDate } }],
      },
    });
    if (conflict)
      throw new ConflictException(
        'El parqueadero ya tiene una asignación activa en este periodo',
      );
    const row = await this.prisma.$transaction(async (tx) => {
      const assignment = await tx.parkingAssignment.create({
        data: {
          complexId,
          parkingSpaceId: dto.parkingSpaceId,
          apartmentId: dto.apartmentId,
          residentId: dto.residentId,
          vehicleId: dto.vehicleId,
          type: dto.type,
          startDate,
          endDate,
          createdById: user.id,
        },
      });
      await tx.parkingSpace.update({
        where: { id: dto.parkingSpaceId },
        data: { status: 'ASSIGNED' },
      });
      return assignment;
    });
    await this.audit.record(
      user,
      'Parking assignment created',
      'ParkingAssignment',
      row.id,
      undefined,
      { parkingSpaceId: dto.parkingSpaceId },
    );
    return row;
  }
  async cancel(id: string, user: AuthenticatedUser) {
    const complexId = this.tenant.requireComplexId(user);
    const assignment = await this.prisma.parkingAssignment.findFirst({
      where: { id, complexId },
    });
    if (!assignment) throw new NotFoundException('Asignación no encontrada');
    if (assignment.status !== 'ACTIVE')
      throw new BadRequestException('La asignación ya no está activa');
    await this.prisma.$transaction([
      this.prisma.parkingAssignment.update({
        where: { id },
        data: { status: 'CANCELLED', endDate: new Date() },
      }),
      this.prisma.parkingSpace.update({
        where: { id: assignment.parkingSpaceId },
        data: { status: 'AVAILABLE' },
      }),
    ]);
    await this.audit.record(
      user,
      'Parking assignment cancelled',
      'ParkingAssignment',
      id,
    );
    return { success: true };
  }
}
