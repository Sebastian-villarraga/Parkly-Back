import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';

jest.setTimeout(30_000);

describe('Auth and tenant integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('login de superadmin devuelve JWT y perfil', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'superadmin@parkly.test',
        password: 'Parkly123*',
      })
      .expect(201);

    expect(response.body.accessToken).toBeTruthy();
    expect(response.body.refreshToken).toBeTruthy();
    expect(response.body.role).toBe('SUPERADMIN');
    expect(response.body.user.email).toBe('superadmin@parkly.test');
  });

  it('admin autenticado no puede acceder a /complexes', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin1@parkly.test',
        password: 'Parkly123*',
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/v1/complexes')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(403);
  });

  it('superadmin autenticado puede consultar /complexes', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'superadmin@parkly.test',
        password: 'Parkly123*',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/api/v1/complexes')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  it('superadmin autenticado puede consultar /audit/logs', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'superadmin@parkly.test',
        password: 'Parkly123*',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/api/v1/audit/logs')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  it('persiste la configuración del dashboard por conjunto y respeta los roles', async () => {
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin1@parkly.test', password: 'Parkly123*' })
      .expect(201);
    const residentLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'residente11@parkly.test', password: 'Parkly123*' })
      .expect(201);
    const securityLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'seguridad1@parkly.test', password: 'Parkly123*' })
      .expect(201);

    await request(app.getHttpServer())
      .patch('/api/v1/settings/dashboard')
      .set('Authorization', `Bearer ${adminLogin.body.accessToken}`)
      .send({
        title: 'Centro de operaciones',
        description: 'Una vista clara del estado de tu conjunto residencial.',
        showMetrics: true,
        showActivity: true,
        showQuickLinks: true,
      })
      .expect(200);

    const initial = await request(app.getHttpServer())
      .get('/api/v1/settings/dashboard')
      .set('Authorization', `Bearer ${residentLogin.body.accessToken}`)
      .expect(200);

    expect(initial.body).toEqual({
      title: expect.any(String),
      description: expect.any(String),
      imageUrl: '',
      showMetrics: true,
      showActivity: true,
      showQuickLinks: true,
    });

    await request(app.getHttpServer())
      .get('/api/v1/settings/dashboard')
      .set('Authorization', `Bearer ${securityLogin.body.accessToken}`)
      .expect(200);

    const updated = await request(app.getHttpServer())
      .patch('/api/v1/settings/dashboard')
      .set('Authorization', `Bearer ${adminLogin.body.accessToken}`)
      .send({ title: 'Operación Los Nogales', showMetrics: false })
      .expect(200);

    expect(updated.body).toMatchObject({
      title: 'Operación Los Nogales',
      showMetrics: false,
      showActivity: true,
      showQuickLinks: true,
    });

    const persisted = await request(app.getHttpServer())
      .get('/api/v1/settings/dashboard')
      .set('Authorization', `Bearer ${residentLogin.body.accessToken}`)
      .expect(200);

    expect(persisted.body).toMatchObject({
      title: 'Operación Los Nogales',
      showMetrics: false,
    });

    await request(app.getHttpServer())
      .patch('/api/v1/settings/dashboard')
      .set('Authorization', `Bearer ${residentLogin.body.accessToken}`)
      .send({ title: 'No permitido' })
      .expect(403);
  });
});
