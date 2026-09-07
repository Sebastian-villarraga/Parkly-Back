import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateReservationDto } from './dto/reservation.dto';
import { ReservationsService } from './reservations.service';
@ApiTags('Reservas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly service: ReservationsService) {}
  @Get() @Roles(Role.ADMIN, Role.RESIDENT) list(@CurrentUser() u: AuthenticatedUser) {
    return this.service.list(u);
  }
  @Post() @Roles(Role.RESIDENT) create(
    @Body() dto: CreateReservationDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.create(dto, u);
  }
  @Patch(':id/cancel') @Roles(Role.ADMIN, Role.RESIDENT) cancel(
    @Param('id') id: string,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.cancel(id, u);
  }
}
