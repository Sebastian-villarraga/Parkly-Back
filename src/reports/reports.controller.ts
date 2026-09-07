import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ReportsService } from './reports.service';
@ApiTags('Reportes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}
  @Get('parking-occupancy') occupancy(@CurrentUser() u: AuthenticatedUser) {
    return this.service.parkingOccupancy(u);
  }
  @Get('access') access(@CurrentUser() u: AuthenticatedUser) {
    return this.service.access(u);
  }
  @Get('fines') fines(@CurrentUser() u: AuthenticatedUser) {
    return this.service.fines(u);
  }
  @Get('payments') payments(@CurrentUser() u: AuthenticatedUser) {
    return this.service.payments(u);
  }
  @Get('reservations') reservations(@CurrentUser() u: AuthenticatedUser) {
    return this.service.reservations(u);
  }
  @Get('assignments') assignments(@CurrentUser() u: AuthenticatedUser) {
    return this.service.assignments(u);
  }
}
