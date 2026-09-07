import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { TenantService } from '../common/services/tenant.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/notification.dto';
@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
  ) {}
  list(user: AuthenticatedUser) {
    return this.prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
  }
  async create(dto: CreateNotificationDto, user: AuthenticatedUser) {
    const complexId = this.tenant.requireComplexId(user);
    const target = await this.prisma.user.findFirst({
      where: { id: dto.userId, complexId },
    });
    if (!target) throw new NotFoundException('Usuario no encontrado en el conjunto');
    return this.prisma.notification.create({
      data: {
        userId: dto.userId,
        complexId,
        title: dto.title,
        message: dto.message,
        type: dto.type,
      },
    });
  }
  async read(id: string, user: AuthenticatedUser) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) throw new NotFoundException('Notificación no encontrada');
    if (notification.userId !== user.id)
      throw new ForbiddenException('No puedes modificar esta notificación');
    return this.prisma.notification.update({ where: { id }, data: { read: true } });
  }
  async readAll(user: AuthenticatedUser) {
    await this.prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });
    return { success: true };
  }
}
