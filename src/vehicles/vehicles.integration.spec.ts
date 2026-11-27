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
    try {
      if (inactiveId) await prisma.vehicle.delete({ where: { id: inactiveId } });
    } finally {
      await app?.close();
    }
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
  it('looks up a vehicle, records entry and exit, and lists persisted events', async () => {
    const found = await lookup('abc123').expect(200);
    const ids: string[] = [];
    try {
      for (const type of ['VEHICLE_ENTRY', 'VEHICLE_EXIT']) {
        const created = await request(app.getHttpServer())
          .post('/api/v1/access-control/events')
          .set('Authorization', `Bearer ${tokens.seguridad1}`)
          .send({ type, vehicleId: found.body.id, notes: 'Integration security flow' })
          .expect(201);
        ids.push(created.body.id);
        expect(created.body).toEqual({
          id: expect.any(String),
          complexId: expect.any(String),
          vehicleId: vehicle.id,
          visitorAuthorizationId: null,
          type,
          registeredById: expect.any(String),
          timestamp: expect.any(String),
          notes: 'Integration security flow',
        });
        expect(Number.isNaN(Date.parse(created.body.timestamp))).toBe(false);
        const persisted = await prisma.accessEvent.findUniqueOrThrow({
          where: { id: created.body.id },
        });
        expect(persisted.type).toBe(type);
      }
      const list = await request(app.getHttpServer())
        .get('/api/v1/access-control/events')
        .set('Authorization', `Bearer ${tokens.seguridad1}`)
        .expect(200);
      for (const id of ids)
        expect(list.body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id,
              vehicle: expect.objectContaining({ id: vehicle.id }),
              registeredBy: expect.objectContaining({ firstName: expect.any(String) }),
            }),
          ]),
        );
      const otherLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'seguridad2@parkly.test', password: 'Parkly123*' })
        .expect(201);
      const otherList = await request(app.getHttpServer())
        .get('/api/v1/access-control/events')
        .set('Authorization', `Bearer ${otherLogin.body.accessToken}`)
        .expect(200);
      expect(otherList.body.some((event: { id: string }) => ids.includes(event.id))).toBe(
        false,
      );
    } finally {
      await prisma.auditLog.deleteMany({
        where: { entity: 'AccessEvent', entityId: { in: ids } },
      });
      await prisma.accessEvent.deleteMany({ where: { id: { in: ids } } });
    }
  });

  it('rejects inactive and foreign vehicles without creating an event', async () => {
    const foreign = await prisma.vehicle.findFirstOrThrow({
      where: { plate: foreignPlate },
    });
    for (const vehicleId of [inactiveId, foreign.id]) {
      const before = await prisma.accessEvent.count({ where: { vehicleId } });
      for (const type of ['VEHICLE_ENTRY', 'VEHICLE_EXIT']) {
        const response = await request(app.getHttpServer())
          .post('/api/v1/access-control/events')
          .set('Authorization', `Bearer ${tokens.seguridad1}`)
          .send({ type, vehicleId })
          .expect(404);
        expect(response.body.message).toBe('Vehículo no encontrado');
      }
      expect(await prisma.accessEvent.count({ where: { vehicleId } })).toBe(before);
    }
  });

  it('validates event resources and enforces event guards', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/access-control/events')
      .set('Authorization', `Bearer ${tokens.seguridad1}`)
      .send({ type: 'VEHICLE_ENTRY' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/access-control/events')
      .set('Authorization', `Bearer ${tokens.seguridad1}`)
      .send({ type: 'INVALID', vehicleId: vehicle.id })
      .expect(400);
    for (const method of ['get', 'post'] as const) {
      await request(app.getHttpServer())
        [method]('/api/v1/access-control/events')
        .expect(401);
      await request(app.getHttpServer())
        [method]('/api/v1/access-control/events')
        .set('Authorization', `Bearer ${tokens.residente11}`)
        .expect(403);
    }
  });
});
