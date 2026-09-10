import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { TenantService } from '../common/services/tenant.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateDashboardSettingsDto } from './dto/dashboard-settings.dto';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
  ) {}

  private readonly select = {
    dashboardTitle: true,
    dashboardDescription: true,
    dashboardImageUrl: true,
    dashboardShowMetrics: true,
    dashboardShowActivity: true,
    dashboardShowQuickLinks: true,
  } as const;

  getDashboard(user: AuthenticatedUser) {
    const complexId = this.tenant.requireComplexId(user);
    return this.prisma.complexSetting
      .upsert({
        where: { complexId },
        create: { complexId },
        update: {},
        select: this.select,
      })
      .then((settings) => this.toDashboard(settings));
  }

  updateDashboard(dto: UpdateDashboardSettingsDto, user: AuthenticatedUser) {
    if (user.role !== Role.ADMIN)
      throw new ForbiddenException(
        'Solo un administrador puede actualizar la configuración',
      );
    const complexId = this.tenant.requireComplexId(user);
    const data = {
      ...(dto.title !== undefined && { dashboardTitle: dto.title }),
      ...(dto.description !== undefined && { dashboardDescription: dto.description }),
      ...(dto.imageUrl !== undefined && { dashboardImageUrl: dto.imageUrl }),
      ...(dto.showMetrics !== undefined && { dashboardShowMetrics: dto.showMetrics }),
      ...(dto.showActivity !== undefined && { dashboardShowActivity: dto.showActivity }),
      ...(dto.showQuickLinks !== undefined && {
        dashboardShowQuickLinks: dto.showQuickLinks,
      }),
    };

    return this.prisma.complexSetting
      .upsert({
        where: { complexId },
        create: {
          complexId,
          ...data,
        },
        update: data,
        select: this.select,
      })
      .then((settings) => this.toDashboard(settings));
  }

  private toDashboard(settings: {
    dashboardTitle: string;
    dashboardDescription: string;
    dashboardImageUrl: string | null;
    dashboardShowMetrics: boolean;
    dashboardShowActivity: boolean;
    dashboardShowQuickLinks: boolean;
  }) {
    return {
      title: settings.dashboardTitle,
      description: settings.dashboardDescription,
      imageUrl: settings.dashboardImageUrl ?? '',
      showMetrics: settings.dashboardShowMetrics,
      showActivity: settings.dashboardShowActivity,
      showQuickLinks: settings.dashboardShowQuickLinks,
    };
  }
}
