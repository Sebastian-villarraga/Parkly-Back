import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateAssignmentDto } from './dto/assignment.dto';
import { AssignmentsService } from './assignments.service';
@ApiTags('Asignaciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('parking-assignments')
export class AssignmentsController {
  constructor(private readonly service: AssignmentsService) {}
  @Get() list(@CurrentUser() u: AuthenticatedUser) {
    return this.service.list(u);
  }
  @Post() create(@Body() dto: CreateAssignmentDto, @CurrentUser() u: AuthenticatedUser) {
    return this.service.create(dto, u);
  }
  @Patch(':id/cancel') cancel(
    @Param('id') id: string,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.cancel(id, u);
  }
}
