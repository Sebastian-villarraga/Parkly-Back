import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateParkingSpaceDto, UpdateParkingSpaceDto } from './dto/parking-space.dto';
import { ParkingSpacesService } from './parking-spaces.service';
@ApiTags('Parqueaderos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('parking-spaces')
export class ParkingSpacesController {
  constructor(private readonly service: ParkingSpacesService) {}
  @Get() @Roles(Role.ADMIN, Role.SECURITY, Role.RESIDENT) list(
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.list(u);
  }
  @Get(':id') @Roles(Role.ADMIN, Role.SECURITY, Role.RESIDENT) get(
    @Param('id') id: string,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.find(id, u);
  }
  @Post() @Roles(Role.ADMIN) create(
    @Body() dto: CreateParkingSpaceDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.create(dto, u);
  }
  @Patch(':id') @Roles(Role.ADMIN) update(
    @Param('id') id: string,
    @Body() dto: UpdateParkingSpaceDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, u);
  }
}
