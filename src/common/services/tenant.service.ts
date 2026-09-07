import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@Injectable()
export class TenantService {
  requireComplexId(user: AuthenticatedUser): string {
    if (!user.complexId || user.role === Role.SUPERADMIN) {
      throw new ForbiddenException(
        'Esta operación requiere pertenecer a un conjunto residencial',
      );
    }
    return user.complexId;
  }

  assertComplex(user: AuthenticatedUser, complexId: string): void {
    if (this.requireComplexId(user) !== complexId) {
      throw new ForbiddenException(
        'No tienes permisos para acceder a recursos de otro conjunto',
      );
    }
  }
}
