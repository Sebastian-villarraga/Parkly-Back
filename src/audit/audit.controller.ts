import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { TenantService } from '../common/services/tenant.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Auditoría')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit')
export class AuditController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
  ) {}
  @Get()
  @Roles(Role.ADMIN)
  list(@CurrentUser() user: AuthenticatedUser, @Query('take') take?: string) {
    return this.prisma.auditLog.findMany({
      where: { complexId: this.tenant.requireComplexId(user) },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(take) || 50, 100),
    });
  }
  @Get('platform')
  @Roles(Role.SUPERADMIN)
  platform(@Query('take') take?: string) {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(take) || 50, 100),
    });
  }

  @Get('logs')
  @Roles(Role.SUPERADMIN)
  logs(@Query('take') take?: string) {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(take) || 50, 100),
    });
  }
}
