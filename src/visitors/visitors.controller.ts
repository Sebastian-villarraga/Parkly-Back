import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateVisitorAuthorizationDto } from './dto/visitor.dto';
import { VisitorsService } from './visitors.service';
@ApiTags('Visitantes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('visitors')
export class VisitorsController {
  constructor(private readonly service: VisitorsService) {}
  @Get('authorizations') @Roles(Role.ADMIN, Role.SECURITY, Role.RESIDENT) list(
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.list(u);
  }
  @Get('authorizations/code/:code') @Roles(Role.ADMIN, Role.SECURITY) byCode(
    @Param('code') code: string,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.getByCode(code, u);
  }
  @Post('authorizations') @Roles(Role.ADMIN, Role.RESIDENT) create(
    @Body() dto: CreateVisitorAuthorizationDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.create(dto, u);
  }
  @Patch('authorizations/:id/cancel') @Roles(Role.ADMIN, Role.RESIDENT) cancel(
    @Param('id') id: string,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.cancel(id, u);
  }
}
