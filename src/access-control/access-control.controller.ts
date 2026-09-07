import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { AccessControlService } from './access-control.service';
import { CreateAccessEventDto, CreateIncidentDto } from './dto/access-event.dto';
@ApiTags('Control de acceso')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('access-control')
export class AccessControlController {
  constructor(private readonly service: AccessControlService) {}
  @Get('events') @Roles(Role.ADMIN, Role.SECURITY) list(
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.list(u);
  }
  @Post('events') @Roles(Role.ADMIN, Role.SECURITY) create(
    @Body() dto: CreateAccessEventDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.create(dto, u);
  }
  @Post('incidents') @Roles(Role.ADMIN, Role.SECURITY) incident(
    @Body() dto: CreateIncidentDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.reportIncident(dto, u);
  }
}
