import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreatePlanDto, UpdatePlanDto } from './dto/plan.dto';
import { PlansService } from './plans.service';
@ApiTags('Planes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPERADMIN)
@Controller('plans')
export class PlansController {
  constructor(private readonly service: PlansService) {}
  @Get() list() {
    return this.service.list();
  }
  @Post() create(@Body() dto: CreatePlanDto, @CurrentUser() u: AuthenticatedUser) {
    return this.service.create(dto, u);
  }
  @Patch(':id') update(
    @Param('id') id: string,
    @Body() dto: UpdatePlanDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, u);
  }
}
