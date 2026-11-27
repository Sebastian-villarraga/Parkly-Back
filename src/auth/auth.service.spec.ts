import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({ compare: jest.fn().mockResolvedValue(true) }));

describe('AuthService refresh token uniqueness', () => {
  afterEach(() => jest.restoreAllMocks());

  it('persists distinct valid refresh tokens for simultaneous logins in the same second', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
    const hashes = new Set<string>();
    const user = {
      id: 'user-1',
      email: 'admin@test.local',
      role: Role.ADMIN,
      complexId: 'complex-1',
      complex: null,
      status: 'ACTIVE',
      passwordHash: 'mocked-hash',
    };
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
        update: jest.fn().mockResolvedValue(user),
      },
      refreshToken: {
        create: jest
          .fn()
          .mockImplementation(async ({ data }: { data: { tokenHash: string } }) => {
            if (hashes.has(data.tokenHash))
              throw new Error('Duplicate refresh token hash');
            hashes.add(data.tokenHash);
            return data;
          }),
      },
    };
    const config = new ConfigService({
      JWT_SECRET: 'unit-test-access-secret',
      JWT_REFRESH_SECRET: 'unit-test-refresh-secret',
    });
    const jwt = new JwtService();
    const service = new AuthService(prisma as unknown as PrismaService, jwt, config);
    const [first, second] = await Promise.all([
      service.login({ email: user.email, password: 'mocked-password' }),
      service.login({ email: user.email, password: 'mocked-password' }),
    ]);
    expect(first.refreshToken).not.toBe(second.refreshToken);
    expect(hashes.size).toBe(2);
    const firstPayload = await jwt.verifyAsync(first.refreshToken, {
      secret: 'unit-test-refresh-secret',
    });
    const secondPayload = await jwt.verifyAsync(second.refreshToken, {
      secret: 'unit-test-refresh-secret',
    });
    expect(firstPayload).toMatchObject({
      sub: user.id,
      complexId: user.complexId,
      jti: expect.any(String),
    });
    expect(secondPayload.jti).not.toBe(firstPayload.jti);
    expect(firstPayload.iat).toBe(secondPayload.iat);
  });
});
