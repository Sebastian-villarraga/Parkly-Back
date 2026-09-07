import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateSecurityUserDto } from './dto/security-user.dto';
import { UsersService } from './users.service';
@ApiTags('Usuarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}
  @Get('security') list(@CurrentUser() u: AuthenticatedUser) {
    return this.service.listSecurity(u);
  }
  @Post('security') create(
    @Body() dto: CreateSecurityUserDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.createSecurity(dto, u);
  }
}
