import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateNotificationDto } from './dto/notification.dto';
import { NotificationsService } from './notifications.service';
@ApiTags('Notificaciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}
  @Get() @Roles(Role.ADMIN, Role.SECURITY, Role.RESIDENT, Role.SUPERADMIN) list(
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.list(u);
  }
  @Post() @Roles(Role.ADMIN) create(
    @Body() dto: CreateNotificationDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.create(dto, u);
  }
  @Patch('read-all')
  @Roles(Role.ADMIN, Role.SECURITY, Role.RESIDENT, Role.SUPERADMIN)
  all(@CurrentUser() u: AuthenticatedUser) {
    return this.service.readAll(u);
  }
  @Patch(':id/read')
  @Roles(Role.ADMIN, Role.SECURITY, Role.RESIDENT, Role.SUPERADMIN)
  read(@Param('id') id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.service.read(id, u);
  }
}
