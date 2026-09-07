import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateResidentDto, UpdateResidentDto } from './dto/resident.dto';
import { ResidentsService } from './residents.service';
@ApiTags('Residentes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('residents')
export class ResidentsController {
  constructor(private readonly service: ResidentsService) {}
  @Get() @Roles(Role.ADMIN, Role.SECURITY) list(@CurrentUser() u: AuthenticatedUser) {
    return this.service.list(u);
  }
  @Get('me') @Roles(Role.RESIDENT) me(@CurrentUser() u: AuthenticatedUser) {
    return this.service.own(u);
  }
  @Get(':id') @Roles(Role.ADMIN, Role.SECURITY, Role.RESIDENT) get(
    @Param('id') id: string,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.assertSelfOrAdmin(id, u);
  }
  @Post() @Roles(Role.ADMIN) create(
    @Body() dto: CreateResidentDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.create(dto, u);
  }
  @Patch(':id') @Roles(Role.ADMIN) update(
    @Param('id') id: string,
    @Body() dto: UpdateResidentDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, u);
  }
  @Delete(':id') @Roles(Role.ADMIN) deactivate(
    @Param('id') id: string,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.deactivate(id, u);
  }
}
