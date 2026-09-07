import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { TenantService } from '../common/services/tenant.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDrawDto } from './dto/draw.dto';

@Injectable()
export class ParkingDrawsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
    private readonly audit: AuditService,
  ) {}

  list(user: AuthenticatedUser) {
    const complexId = this.tenant.requireComplexId(user);
    return this.prisma.parkingDraw.findMany({
      where:
        user.role === 'RESIDENT'
          ? { complexId, participants: { some: { resident: { userId: user.id } } } }
          : { complexId },
      include: {
        spaces: { include: { parkingSpace: true } },
        participants: {
          include: {
            resident: {
              include: { user: { select: { firstName: true, lastName: true } } },
            },
          },
        },
        results: {
          include: {
            parkingSpace: true,
            resident: {
              include: { user: { select: { firstName: true, lastName: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateDrawDto, user: AuthenticatedUser) {
    const complexId = this.tenant.requireComplexId(user);
    const validFrom = new Date(dto.validFrom);
    const validUntil = new Date(dto.validUntil);
    if (validUntil <= validFrom) {
      throw new BadRequestException('El periodo de vigencia no es válido');
    }
    const spaceIds = [...new Set(dto.parkingSpaceIds)];
    const residentIds = [...new Set(dto.residentIds)];
    const [spaces, residents] = await Promise.all([
      this.prisma.parkingSpace.findMany({
        where: { id: { in: spaceIds }, complexId, type: 'DRAW' },
      }),
      this.prisma.resident.findMany({
        where: { id: { in: residentIds }, complexId, status: 'ACTIVE' },
      }),
    ]);
    if (spaces.length !== spaceIds.length || residents.length !== residentIds.length) {
      throw new NotFoundException(
        'Parqueaderos DRAW o residentes inválidos para este conjunto',
      );
    }
    const row = await this.prisma.parkingDraw.create({
      data: {
        complexId,
        name: dto.name,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        validFrom,
        validUntil,
        status: dto.scheduledAt ? 'SCHEDULED' : 'DRAFT',
        spaces: {
          create: spaces.map((space) => ({ parkingSpaceId: space.id })),
        },
        participants: {
          create: residents.map((resident) => ({ residentId: resident.id })),
        },
      },
      include: { spaces: true, participants: true },
    });
    await this.audit.record(
      user,
      'Parking draw created',
      'ParkingDraw',
      row.id,
      undefined,
      { name: row.name },
    );
    return row;
  }

  async execute(id: string, user: AuthenticatedUser) {
    const complexId = this.tenant.requireComplexId(user);
    const draw = await this.prisma.parkingDraw.findFirst({
      where: { id, complexId },
      include: {
        spaces: { include: { parkingSpace: true } },
        participants: { where: { eligible: true } },
      },
    });
    if (!draw) throw new NotFoundException('Sorteo no encontrado');
    if (draw.status === 'COMPLETED' || draw.status === 'CANCELLED') {
      throw new ConflictException('El sorteo no puede ejecutarse');
    }
    const spaces = draw.spaces.filter(
      (entry) => entry.parkingSpace.status === 'AVAILABLE',
    );
    if (!spaces.length) {
      throw new BadRequestException('No hay parqueaderos disponibles para el sorteo');
    }
    const winners = [...draw.participants]
      .sort(() => Math.random() - 0.5)
      .slice(0, spaces.length);
    if (!winners.length) {
      throw new BadRequestException('No hay participantes elegibles');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.parkingDraw.update({ where: { id }, data: { status: 'RUNNING' } });
      for (let index = 0; index < winners.length; index += 1) {
        const winner = winners[index];
        const space = spaces[index];
        const assignment = await tx.parkingAssignment.create({
          data: {
            complexId,
            parkingSpaceId: space.parkingSpaceId,
            residentId: winner.residentId,
            type: 'DRAW',
            startDate: draw.validFrom,
            endDate: draw.validUntil,
            status: 'ACTIVE',
            createdById: user.id,
          },
        });
        await tx.parkingDrawResult.create({
          data: {
            drawId: id,
            parkingSpaceId: space.parkingSpaceId,
            residentId: winner.residentId,
            assignmentId: assignment.id,
          },
        });
        await tx.parkingSpace.update({
          where: { id: space.parkingSpaceId },
          data: { status: 'ASSIGNED' },
        });
      }
      await tx.parkingDraw.update({
        where: { id },
        data: { status: 'COMPLETED', executedAt: new Date(), executedById: user.id },
      });
    });
    await this.audit.record(user, 'Parking draw executed', 'ParkingDraw', id);
    return this.prisma.parkingDraw.findUnique({
      where: { id },
      include: {
        results: {
          include: {
            parkingSpace: true,
            resident: {
              include: { user: { select: { firstName: true, lastName: true } } },
            },
          },
        },
      },
    });
  }
}
