import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateFineDto, UpdateFineDto } from './dto/fine.dto';
import { FinesService } from './fines.service';
@ApiTags('Multas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('fines')
export class FinesController {
  constructor(private readonly service: FinesService) {}
  @Get() @Roles(Role.ADMIN, Role.RESIDENT) list(@CurrentUser() u: AuthenticatedUser) {
    return this.service.list(u);
  }
  @Post() @Roles(Role.ADMIN) create(
    @Body() dto: CreateFineDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.create(dto, u);
  }
  @Patch(':id') @Roles(Role.ADMIN) update(
    @Param('id') id: string,
    @Body() dto: UpdateFineDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, u);
  }
}
