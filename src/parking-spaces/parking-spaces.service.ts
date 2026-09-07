import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { TenantService } from '../common/services/tenant.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateParkingSpaceDto, UpdateParkingSpaceDto } from './dto/parking-space.dto';
@Injectable()
export class ParkingSpacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
    private readonly audit: AuditService,
  ) {}
  list(user: AuthenticatedUser) {
    return this.prisma.parkingSpace.findMany({
      where: { complexId: this.tenant.requireComplexId(user) },
      include: { _count: { select: { assignments: true, reservations: true } } },
      orderBy: { number: 'asc' },
    });
  }
  async find(id: string, user: AuthenticatedUser) {
    const row = await this.prisma.parkingSpace.findFirst({
      where: { id, complexId: this.tenant.requireComplexId(user) },
    });
    if (!row) throw new NotFoundException('Parqueadero no encontrado');
    return row;
  }
  async create(dto: CreateParkingSpaceDto, user: AuthenticatedUser) {
    try {
      const row = await this.prisma.parkingSpace.create({
        data: { ...dto, complexId: this.tenant.requireComplexId(user) },
      });
      await this.audit.record(
        user,
        'Parking space created',
        'ParkingSpace',
        row.id,
        undefined,
        { number: row.number },
      );
      return row;
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002')
        throw new ConflictException('Ya existe este número de parqueadero');
      throw e;
    }
  }
  async update(id: string, dto: UpdateParkingSpaceDto, user: AuthenticatedUser) {
    await this.find(id, user);
    const row = await this.prisma.parkingSpace.update({ where: { id }, data: dto });
    await this.audit.record(user, 'Parking space updated', 'ParkingSpace', id);
    return row;
  }
}
