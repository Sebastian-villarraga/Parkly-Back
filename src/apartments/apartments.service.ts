import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { TenantService } from '../common/services/tenant.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApartmentDto, UpdateApartmentDto } from './dto/apartment.dto';
@Injectable()
export class ApartmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
    private readonly audit: AuditService,
  ) {}
  list(user: AuthenticatedUser) {
    return this.prisma.apartment.findMany({
      where: { complexId: this.tenant.requireComplexId(user) },
      include: {
        residents: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                status: true,
              },
            },
          },
        },
        _count: { select: { assignments: true } },
      },
      orderBy: [{ tower: 'asc' }, { number: 'asc' }],
    });
  }
  async find(id: string, user: AuthenticatedUser) {
    const row = await this.prisma.apartment.findFirst({
      where: { id, complexId: this.tenant.requireComplexId(user) },
      include: {
        residents: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });
    if (!row) throw new NotFoundException('Apartamento no encontrado');
    return row;
  }
  async create(dto: CreateApartmentDto, user: AuthenticatedUser) {
    const complexId = this.tenant.requireComplexId(user);
    try {
      const row = await this.prisma.apartment.create({ data: { ...dto, complexId } });
      await this.audit.record(user, 'Apartment created', 'Apartment', row.id, undefined, {
        number: row.number,
      });
      return row;
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002')
        throw new ConflictException('Ya existe ese apartamento');
      throw error;
    }
  }
  async update(id: string, dto: UpdateApartmentDto, user: AuthenticatedUser) {
    const old = await this.find(id, user);
    const row = await this.prisma.apartment.update({ where: { id }, data: dto });
    await this.audit.record(
      user,
      'Apartment updated',
      'Apartment',
      id,
      { status: old.status },
      { status: row.status },
    );
    return row;
  }
}
