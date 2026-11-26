import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { PrismaService } from '../prisma/prisma.service';

jest.setTimeout(60_000);

describe('Security vehicle lookup (real JWT and tenant guards)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const tokens: Record<string, string> = {};
  let vehicle: { id: string; plate: string; type: string; status: string };
  let inactiveId: string;
  let foreignPlate: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    prisma = app.get(PrismaService);
    for (const role of ['admin1', 'seguridad1', 'residente11', 'superadmin']) {
      const login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: `${role}@parkly.test`, password: 'Parkly123*' })
        .expect(201);
      tokens[role] = login.body.accessToken;
    }
    const actor = await prisma.user.findUniqueOrThrow({
      where: { email: 'seguridad1@parkly.test' },
    });
    const own = await prisma.vehicle.findFirstOrThrow({
      where: { complexId: actor.complexId!, plate: 'ABC123' },
    });
    vehicle = { id: own.id, plate: own.plate, type: own.type, status: own.status };
    const inactive = await prisma.vehicle.create({
      data: {
        complexId: own.complexId,
        residentId: own.residentId,
        plate: 'TST-001',
        type: 'OTHER',
        status: 'INACTIVE',
      },
    });
    inactiveId = inactive.id;
    const foreign = await prisma.vehicle.findFirstOrThrow({
      where: { complexId: { not: own.complexId }, status: 'ACTIVE' },
    });
    foreignPlate = foreign.plate;
  });

  afterAll(async () => {
    if (inactiveId) await prisma.vehicle.delete({ where: { id: inactiveId } });
    await app?.close();
  });

  const lookup = (plate: string, role = 'seguridad1') =>
    request(app.getHttpServer())
      .get('/api/v1/vehicles/lookup')
      .query({ plate })
      .set('Authorization', `Bearer ${tokens[role]}`);

  it.each(['seguridad1', 'admin1'])(
    'normalizes lowercase and returns exactly four fields for %s',
    async (role) => {
      const response = await lookup('abc123', role).expect(200);
      expect(response.body).toEqual(vehicle);
    },
  );

  it('returns the real inactive status', async () => {
    const response = await lookup('tst-001').expect(200);
    expect(response.body).toEqual({
      id: inactiveId,
      plate: 'TST-001',
      type: 'OTHER',
      status: 'INACTIVE',
    });
  });

  it.each(['', 'AB', 'ABC123456', 'ABC 123', 'ábc123'])(
    'rejects invalid plate %s',
    async (plate) => {
      await lookup(plate).expect(400);
    },
  );

  it('rejects missing or repeated query values', async () => {
    for (const suffix of ['', '?plate=ABC123&plate=ABC223']) {
      await request(app.getHttpServer())
        .get(`/api/v1/vehicles/lookup${suffix}`)
        .set('Authorization', `Bearer ${tokens.seguridad1}`)
        .expect(400);
    }
  });

  it('hides foreign and missing vehicles behind the same 404', async () => {
    const foreign = await lookup(foreignPlate).expect(404);
    const absent = await lookup('ZZZ999').expect(404);
    expect(foreign.body.message).toBe('Vehículo no encontrado');
    expect(absent.body.message).toBe(foreign.body.message);
    expect(foreign.body.statusCode).toBe(absent.body.statusCode);
  });

  it('uses real guards for missing/invalid JWT and disallowed roles', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/vehicles/lookup?plate=ABC123')
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/vehicles/lookup?plate=ABC123')
      .set('Authorization', 'Bearer invalid')
      .expect(401);
    for (const role of ['residente11', 'superadmin'])
      await lookup('ABC123', role).expect(403);
  });
});
