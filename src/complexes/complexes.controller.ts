import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ComplexesService } from './complexes.service';
import { CreateComplexAdminDto } from './dto/create-complex-admin.dto';
import {
  CreateComplexDto,
  UpdateComplexDto,
  UpdateComplexStatusDto,
} from './dto/complex.dto';

@ApiTags('Conjuntos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPERADMIN)
@Controller('complexes')
export class ComplexesController {
  constructor(private readonly service: ComplexesService) {}
  @Get() list() {
    return this.service.list();
  }
  @Post() create(@Body() dto: CreateComplexDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user);
  }
  @Get(':id') find(@Param('id') id: string) {
    return this.service.find(id);
  }
  @Patch(':id') update(
    @Param('id') id: string,
    @Body() dto: UpdateComplexDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, user);
  }
  @Patch(':id/status') updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateComplexStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateStatus(id, dto, user);
  }
  @Post(':id/admin') createAdmin(
    @Param('id') id: string,
    @Body() dto: CreateComplexAdminDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.createAdmin(id, dto, user);
  }
}
