import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    user: AuthenticatedUser | null,
    action: string,
    entity: string,
    entityId?: string,
    oldValue?: Prisma.InputJsonValue,
    newValue?: Prisma.InputJsonValue,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        complexId: user?.complexId,
        userId: user?.id,
        action,
        entity,
        entityId,
        oldValue,
        newValue,
      },
    });
  }
}
