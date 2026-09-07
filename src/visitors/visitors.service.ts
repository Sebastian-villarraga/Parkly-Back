import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { randomBytes } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { TenantService } from '../common/services/tenant.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVisitorAuthorizationDto } from './dto/visitor.dto';
@Injectable()
export class VisitorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
    private readonly audit: AuditService,
  ) {}
  list(user: AuthenticatedUser) {
    const complexId = this.tenant.requireComplexId(user);
    return this.prisma.visitorAuthorization.findMany({
      where:
        user.role === Role.RESIDENT
          ? { complexId, resident: { userId: user.id } }
          : { complexId },
      include: {
        visitor: true,
        resident: { include: { user: { select: { firstName: true, lastName: true } } } },
        apartment: true,
      },
      orderBy: { validFrom: 'desc' },
    });
  }
  async getByCode(code: string, user: AuthenticatedUser) {
    const row = await this.prisma.visitorAuthorization.findFirst({
      where: { authorizationCode: code, complexId: this.tenant.requireComplexId(user) },
      include: {
        visitor: true,
        apartment: true,
        resident: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    });
    if (!row) throw new NotFoundException('Autorización no encontrada');
    return row;
  }
  async create(dto: CreateVisitorAuthorizationDto, user: AuthenticatedUser) {
    const complexId = this.tenant.requireComplexId(user);
    const resident = await this.resolveResident(dto.residentId, user, complexId);
    const [from, until] = [new Date(dto.validFrom), new Date(dto.validUntil)];
    if (until <= from || until < new Date())
      throw new BadRequestException('El periodo de autorización no es válido');
    const visitor = await this.prisma.visitor.create({
      data: {
        complexId,
        fullName: dto.visitorName,
        identificationNumber: dto.identificationNumber,
        phone: dto.phone,
      },
    });
    const row = await this.prisma.visitorAuthorization.create({
      data: {
        complexId,
        visitorId: visitor.id,
        residentId: resident.id,
        apartmentId: resident.apartmentId,
        plate: dto.plate?.toUpperCase(),
        validFrom: from,
        validUntil: until,
        authorizationCode: `PK-${randomBytes(4).toString('hex').toUpperCase()}`,
      },
      include: { visitor: true },
    });
    await this.audit.record(
      user,
      'Visitor authorized',
      'VisitorAuthorization',
      row.id,
      undefined,
      { authorizationCode: row.authorizationCode },
    );
    return row;
  }
  async cancel(id: string, user: AuthenticatedUser) {
    const row = await this.prisma.visitorAuthorization.findFirst({
      where: { id, complexId: this.tenant.requireComplexId(user) },
      include: { resident: true },
    });
    if (!row) throw new NotFoundException('Autorización no encontrada');
    if (user.role === Role.RESIDENT && row.resident.userId !== user.id)
      throw new ForbiddenException('Solo puedes cancelar tus autorizaciones');
    if (row.status !== 'AUTHORIZED')
      throw new BadRequestException('La autorización no puede cancelarse');
    const changed = await this.prisma.visitorAuthorization.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
    await this.audit.record(
      user,
      'Visitor authorization cancelled',
      'VisitorAuthorization',
      id,
    );
    return changed;
  }
  private async resolveResident(
    residentId: string | undefined,
    user: AuthenticatedUser,
    complexId: string,
  ) {
    if (user.role === Role.RESIDENT) {
      if (residentId)
        throw new ForbiddenException(
          'No puedes crear autorizaciones para otro residente',
        );
      const own = await this.prisma.resident.findFirst({
        where: { userId: user.id, complexId },
      });
      if (!own) throw new NotFoundException('Perfil de residente no encontrado');
      return own;
    }
    if (!residentId) throw new BadRequestException('residentId es requerido');
    const resident = await this.prisma.resident.findFirst({
      where: { id: residentId, complexId },
    });
    if (!resident) throw new NotFoundException('Residente no encontrado');
    return resident;
  }
}
