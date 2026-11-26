import {
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
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto';
@Injectable()
export class VehiclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
    private readonly audit: AuditService,
  ) {}
  list(user: AuthenticatedUser) {
    const complexId = this.tenant.requireComplexId(user);
    return this.prisma.vehicle.findMany({
      where:
        user.role === Role.RESIDENT
          ? { complexId, resident: { userId: user.id } }
          : { complexId },
      include: {
        resident: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { plate: 'asc' },
    });
  }
  async find(id: string, user: AuthenticatedUser) {
    const complexId = this.tenant.requireComplexId(user);
    const row = await this.prisma.vehicle.findFirst({
      where: { id, complexId },
      include: { resident: true },
    });
    if (!row) throw new NotFoundException('Vehículo no encontrado');
    if (user.role === Role.RESIDENT && row.resident.userId !== user.id)
      throw new ForbiddenException('Solo puedes acceder a tus vehículos');
    return row;
  }
  async lookup(plate: string, user: AuthenticatedUser) {
    const complexId = this.tenant.requireComplexId(user);
    const row = await this.prisma.vehicle.findFirst({
      where: { complexId, plate: plate.toUpperCase() },
      select: { id: true, plate: true, type: true, status: true },
    });
    if (!row) throw new NotFoundException('Vehículo no encontrado');
    return row;
  }
  async create(dto: CreateVehicleDto, user: AuthenticatedUser) {
    const complexId = this.tenant.requireComplexId(user);
    const resident = await this.resolveResident(dto.residentId, user, complexId);
    try {
      const row = await this.prisma.vehicle.create({
        data: {
          ...dto,
          residentId: resident.id,
          complexId,
          plate: dto.plate.toUpperCase(),
        },
      });
      await this.audit.record(user, 'Vehicle created', 'Vehicle', row.id, undefined, {
        plate: row.plate,
      });
      return row;
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002')
        throw new ConflictException(
          'Ya existe un vehículo con esta placa en el conjunto',
        );
      throw error;
    }
  }
  async update(id: string, dto: UpdateVehicleDto, user: AuthenticatedUser) {
    await this.find(id, user);
    if (dto.residentId && user.role !== Role.ADMIN)
      throw new ForbiddenException('No puedes cambiar el propietario del vehículo');
    if (dto.residentId)
      await this.resolveResident(
        dto.residentId,
        user,
        this.tenant.requireComplexId(user),
      );
    const row = await this.prisma.vehicle.update({
      where: { id },
      data: { ...dto, plate: dto.plate?.toUpperCase() },
    });
    await this.audit.record(user, 'Vehicle updated', 'Vehicle', id);
    return row;
  }
  async deactivate(id: string, user: AuthenticatedUser) {
    await this.find(id, user);
    const row = await this.prisma.vehicle.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
    await this.audit.record(user, 'Vehicle deactivated', 'Vehicle', id);
    return row;
  }
  private async resolveResident(
    requestedId: string | undefined,
    user: AuthenticatedUser,
    complexId: string,
  ) {
    const where = requestedId
      ? { id: requestedId, complexId }
      : { userId: user.id, complexId };
    if (!requestedId && user.role !== Role.RESIDENT)
      throw new NotFoundException('residentId es requerido');
    const resident = await this.prisma.resident.findFirst({ where });
    if (!resident) throw new NotFoundException('Residente no encontrado en el conjunto');
    return resident;
  }
}
