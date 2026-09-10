import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { UpdateDashboardSettingsDto } from './dto/dashboard-settings.dto';
import { SettingsService } from './settings.service';

@ApiTags('Configuración')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get('dashboard')
  @Roles(Role.ADMIN, Role.SECURITY, Role.RESIDENT)
  getDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getDashboard(user);
  }

  @Patch('dashboard')
  @Roles(Role.ADMIN)
  updateDashboard(
    @Body() dto: UpdateDashboardSettingsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateDashboard(dto, user);
  }
}
