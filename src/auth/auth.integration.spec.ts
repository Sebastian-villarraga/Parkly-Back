import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';

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
});
