import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ApartmentsService } from './apartments.service';
import { CreateApartmentDto, UpdateApartmentDto } from './dto/apartment.dto';
@ApiTags('Apartamentos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('apartments')
export class ApartmentsController {
  constructor(private readonly service: ApartmentsService) {}
  @Get() @Roles(Role.ADMIN, Role.SECURITY) list(@CurrentUser() u: AuthenticatedUser) {
    return this.service.list(u);
  }
  @Get(':id') @Roles(Role.ADMIN, Role.SECURITY) find(
    @Param('id') id: string,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.find(id, u);
  }
  @Post() @Roles(Role.ADMIN) create(
    @Body() dto: CreateApartmentDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.create(dto, u);
  }
  @Patch(':id') @Roles(Role.ADMIN) update(
    @Param('id') id: string,
    @Body() dto: UpdateApartmentDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, u);
  }
}
