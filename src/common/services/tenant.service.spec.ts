import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { TenantService } from './tenant.service';

describe('TenantService', () => {
  const service = new TenantService();
  const tenantA = {
    id: 'a-user',
    email: 'a@test.co',
    role: Role.ADMIN,
    complexId: 'complex-a',
  };
  it('permite usar el tenant propio', () =>
    expect(service.requireComplexId(tenantA)).toBe('complex-a'));
  it('bloquea recursos de otro conjunto', () =>
    expect(() => service.assertComplex(tenantA, 'complex-b')).toThrow(
      ForbiddenException,
    ));
  it('no convierte al superadmin en administrador interno automático', () =>
    expect(() =>
      service.requireComplexId({ ...tenantA, role: Role.SUPERADMIN, complexId: null }),
    ).toThrow(ForbiddenException));
});
