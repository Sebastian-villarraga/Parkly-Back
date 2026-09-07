import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateDrawDto } from './dto/draw.dto';
import { ParkingDrawsService } from './parking-draws.service';
@ApiTags('Sorteos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('parking-draws')
export class ParkingDrawsController {
  constructor(private readonly service: ParkingDrawsService) {}
  @Get() @Roles(Role.ADMIN, Role.RESIDENT) list(@CurrentUser() u: AuthenticatedUser) {
    return this.service.list(u);
  }
  @Post() @Roles(Role.ADMIN) create(
    @Body() dto: CreateDrawDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.create(dto, u);
  }
  @Post(':id/execute') @Roles(Role.ADMIN) execute(
    @Param('id') id: string,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.execute(id, u);
  }
}
