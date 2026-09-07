# PARKLY Back

Backend MVP de **PARKLY**, una plataforma SaaS multi-tenant para la gestión de parqueaderos de conjuntos residenciales. Este repositorio contiene exclusivamente la API; no depende ni modifica Parkly-Front.

## Tecnologías

- Node.js, TypeScript y NestJS
- PostgreSQL + Prisma ORM
- JWT con access/refresh tokens y bcrypt
- class-validator, Swagger/OpenAPI, Jest, ESLint y Prettier
- Docker Compose para PostgreSQL local

## Arquitectura y seguridad

La API se organiza por dominio (`residents`, `vehicles`, `reservations`, etc.). Los controladores son delgados y la lógica, validación de relaciones y persistencia están en servicios con Prisma.

Todos los recursos propios de un conjunto se consultan y mutan usando el `complexId` del JWT, nunca uno enviado por el cliente. `TenantService` rechaza usuarios sin tenant y recursos de otro conjunto. Los guards JWT + roles aplican RBAC: `SUPERADMIN`, `ADMIN`, `SECURITY` y `RESIDENT`.

El superadministrador solo tiene las rutas explícitas de plataforma (`/complexes`, `/plans`, `/subscriptions` y auditoría global); no recibe acceso automático a las operaciones internas de un conjunto.

## Inicio rápido

1. Copie el archivo de variables:

   ```bash
   cp .env.example .env
   ```

2. Levante PostgreSQL:

   ```bash
   docker compose up -d
   ```

3. Instale dependencias, genere el cliente y aplique la migración:

   ```bash
   pnpm install
   pnpm prisma:generate
   pnpm prisma:migrate -- --name init
   ```

4. Cargue datos de demostración y arranque la API:

   ```bash
   pnpm prisma:seed
   pnpm start:dev
   ```

La API queda en `http://localhost:4000/api/v1` y Swagger en `http://localhost:4000/docs`.

## Variables de entorno

Revise [`.env.example`](.env.example). En producción cambie ambos secretos JWT por valores largos y aleatorios, use una contraseña de base de datos segura y defina un `CORS_ORIGIN` específico. Nunca suba `.env`.

## Usuarios de seed

Todos usan la contraseña `Parkly123*`:

| Rol | Correo |
| --- | --- |
| Superadmin | `superadmin@parkly.test` |
| Administrador conjunto 1 | `admin1@parkly.test` |
| Seguridad conjunto 1 | `seguridad1@parkly.test` |
| Residente conjunto 1 | `residente11@parkly.test` |

El seed crea dos conjuntos, planes, suscripciones, apartamentos, residentes, vehículos, espacios, asignaciones, reservas, autorizaciones de visitante, multa, cobro/pago, notificación y auditoría. Los datos son ficticios y en COP.

## Endpoints principales

- `POST /auth/login`, `/refresh`, `/logout`, `/forgot-password`, `/reset-password`; `GET /auth/me`
- Superadmin: `GET|POST /complexes`, `GET|PATCH /complexes/:id`, `PATCH /complexes/:id/status`, `/plans`, `/subscriptions`
- Administración: `/apartments`, `/residents`, `/vehicles`, `/parking-spaces`, `/parking-assignments`, `/parking-draws`, `/charges`, `/payments`, `/reports`
- Seguridad: lecturas de residentes/vehículos/parqueaderos, `POST /access-control/events` y `/access-control/incidents`
- Residentes: perfil, vehículos propios, reservas, autorizaciones de visitante, multas/cobros/pagos propios y notificaciones.

Los endpoints protegidos requieren `Authorization: Bearer <accessToken>`. Swagger permite configurar ese token con **Authorize**.

## Reglas relevantes del MVP

- Placas se normalizan a mayúsculas y son únicas por conjunto.
- Las reservas verifican tipo de espacio, configuración, intervalo y solapamientos.
- Asignaciones conservan historial mediante estados; no se eliminan físicamente.
- Sorteos guardan participantes, espacios y resultados; al ejecutar se crean asignaciones auditables.
- Pagos son simulados y pasan de pendiente a confirmado; no hay proveedor externo.
- Recuperación de contraseña genera un token seguro; en desarrollo se devuelve para pruebas. El punto de entrega por correo está aislado para una integración futura.
- Notificaciones y `AccessEvent` son persistentes y dejan preparada la incorporación posterior de realtime.

## Calidad y verificación

```bash
pnpm build
pnpm lint
pnpm test
```

La prueba de tenant confirma que un usuario de un conjunto no puede usar recursos de otro ni que el superadmin obtenga acceso interno implícito. Para pruebas integradas, use la base de Docker y el seed antes de iniciar la API.

## Estructura

`src/common` contiene guards, decoradores, filtro uniforme de errores y aislamiento de tenant. `src/prisma` encapsula el cliente. Cada carpeta de dominio contiene controller, service y DTOs. El esquema completo y el seed viven en `prisma/`.
