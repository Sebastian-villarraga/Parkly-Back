import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { TenantService } from '../common/services/tenant.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateResidentDto, UpdateResidentDto } from './dto/resident.dto';
const residentInclude = {
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      status: true,
    },
  },
  apartment: true,
  vehicles: true,
} as const;
@Injectable()
export class ResidentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
    private readonly audit: AuditService,
  ) {}
  list(user: AuthenticatedUser) {
    return this.prisma.resident.findMany({
      where: { complexId: this.tenant.requireComplexId(user) },
      include: residentInclude,
      orderBy: { createdAt: 'desc' },
    });
  }
  async find(id: string, user: AuthenticatedUser) {
    const row = await this.prisma.resident.findFirst({
      where: { id, complexId: this.tenant.requireComplexId(user) },
      include: residentInclude,
    });
    if (!row) throw new NotFoundException('Residente no encontrado');
    return row;
  }
  async own(user: AuthenticatedUser) {
    const row = await this.prisma.resident.findFirst({
      where: { userId: user.id, complexId: this.tenant.requireComplexId(user) },
      include: residentInclude,
    });
    if (!row) throw new NotFoundException('Perfil de residente no encontrado');
    return row;
  }
  async create(dto: CreateResidentDto, actor: AuthenticatedUser) {
    const complexId = this.tenant.requireComplexId(actor);
    const apartment = await this.prisma.apartment.findFirst({
      where: { id: dto.apartmentId, complexId },
    });
    if (!apartment)
      throw new NotFoundException('Apartamento no encontrado en el conjunto');
    try {
      const resident = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: dto.email.toLowerCase(),
            passwordHash: await bcrypt.hash(dto.password, 12),
            firstName: dto.firstName,
            lastName: dto.lastName,
            phone: dto.phone,
            role: Role.RESIDENT,
            complexId,
          },
        });
        return tx.resident.create({
          data: {
            userId: user.id,
            complexId,
            apartmentId: dto.apartmentId,
            identificationType: dto.identificationType,
            identificationNumber: dto.identificationNumber,
            emergencyContact: dto.emergencyContact,
          },
          include: residentInclude,
        });
      });
      await this.audit.record(
        actor,
        'Resident created',
        'Resident',
        resident.id,
        undefined,
        { apartmentId: dto.apartmentId },
      );
      return resident;
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002')
        throw new ConflictException('El correo o identificación ya existe');
      throw error;
    }
  }
  async update(id: string, dto: UpdateResidentDto, actor: AuthenticatedUser) {
    const old = await this.find(id, actor);
    if (dto.apartmentId) {
      const apartment = await this.prisma.apartment.findFirst({
        where: { id: dto.apartmentId, complexId: this.tenant.requireComplexId(actor) },
      });
      if (!apartment)
        throw new NotFoundException('Apartamento no encontrado en el conjunto');
    }
    const row = await this.prisma.$transaction(async (tx) => {
      if (dto.firstName || dto.lastName || dto.phone || dto.email)
        await tx.user.update({
          where: { id: old.userId },
          data: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            phone: dto.phone,
            email: dto.email?.toLowerCase(),
          },
        });
      return tx.resident.update({
        where: { id },
        data: {
          apartmentId: dto.apartmentId,
          identificationType: dto.identificationType,
          identificationNumber: dto.identificationNumber,
          emergencyContact: dto.emergencyContact,
        },
        include: residentInclude,
      });
    });
    await this.audit.record(actor, 'Resident updated', 'Resident', id);
    return row;
  }
  async deactivate(id: string, actor: AuthenticatedUser) {
    const row = await this.find(id, actor);
    await this.prisma.$transaction([
      this.prisma.resident.update({ where: { id }, data: { status: 'INACTIVE' } }),
      this.prisma.user.update({
        where: { id: row.userId },
        data: { status: 'INACTIVE' },
      }),
    ]);
    await this.audit.record(actor, 'Resident deactivated', 'Resident', id);
    return { success: true };
  }
  async assertSelfOrAdmin(id: string, user: AuthenticatedUser) {
    const row = await this.find(id, user);
    if (user.role === Role.RESIDENT && row.userId !== user.id)
      throw new ForbiddenException('Solo puedes acceder a tu propio perfil');
    return row;
  }
}
