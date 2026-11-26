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
   pnpm prisma:deploy
   ```

4. Cargue datos de demostración y arranque la API:

   ```bash
   pnpm prisma:seed
   pnpm start:dev
   ```

La API queda en `http://localhost:4000/api/v1` y Swagger en `http://localhost:4000/docs`.

## Despliegue conjunto en EC2

Este repositorio incluye una plantilla de Nginx para servir el build del frontend y enrutar `/api/` y `/docs` al backend, además de una unidad systemd para mantener la API en ejecución. Consulte [`deploy/README.md`](deploy/README.md) para los pasos de instalación y configuración en Ubuntu.

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

## Demo reproducible y recorrido de seguridad

Requisitos: Node.js 22, Corepack, pnpm 9.15.4 y Docker Compose. Use una base
local de demo; las pruebas de integración escriben datos y requieren el seed.
No ejecute seed ni estas suites sobre una base de producción.

```powershell
Copy-Item .env.example .env
corepack enable
corepack pnpm install --frozen-lockfile
docker compose up -d
corepack pnpm prisma:generate
corepack pnpm prisma:deploy
corepack pnpm prisma:seed
corepack pnpm test
corepack pnpm build
corepack pnpm start:prod
```

Conserve su `.env` si ya existe. `prisma:deploy` aplica las migraciones versionadas;
no es necesario crear una migración nueva para preparar la demo.
Swagger: http://localhost:4000/docs. Para desarrollo: `corepack pnpm start:dev`.

El seed crea `ABC123` en el conjunto 1 y `ABC223` en el conjunto 2.
La contraseña de demo es `Parkly123*`. Este ejemplo PowerShell inicia sesión
como seguridad, consulta la placa y registra entrada y salida:

```powershell
$base = 'http://localhost:4000/api/v1'
$loginBody = @{ email = 'seguridad1@parkly.test'; password = 'Parkly123*' } | ConvertTo-Json
$login = Invoke-RestMethod "$base/auth/login" -Method Post -ContentType 'application/json' -Body $loginBody
$headers = @{ Authorization = "Bearer $($login.accessToken)" }
Invoke-RestMethod "$base/auth/me" -Headers $headers
$vehicle = Invoke-RestMethod "$base/vehicles/lookup?plate=abc123" -Headers $headers
foreach ($type in @('VEHICLE_ENTRY', 'VEHICLE_EXIT')) {
  $body = @{ type = $type; vehicleId = $vehicle.id; notes = 'Demo seguridad' } | ConvertTo-Json
  Invoke-RestMethod "$base/access-control/events" -Method Post -Headers $headers -ContentType 'application/json' -Body $body
}
Invoke-RestMethod "$base/access-control/events" -Headers $headers
```

Contrato de consulta: `GET /api/v1/vehicles/lookup?plate=ABC123`, ADMIN o SECURITY,
200 con exactamente `{ "id": "...", "plate": "ABC123", "type": "CAR", "status": "ACTIVE" }`.
`type`: CAR, MOTORCYCLE, BICYCLE, OTHER. `status`: ACTIVE, INACTIVE; una coincidencia
inactiva también devuelve 200. Comparte la validación de creación: 3 a 8 letras,
números o guiones, sin espacios; normaliza a mayúsculas. Placa omitida, vacía o
inválida: 400. Placa ausente o de otro conjunto: 404, `Vehículo no encontrado`.
Sin JWT o JWT inválido: 401. RESIDENT y SUPERADMIN: 403. El conjunto siempre
proviene de la sesión validada y TenantService; no se acepta `complexId` de query.

`POST /api/v1/access-control/events` conserva HTTP 201 y el cuerpo
`{ "type": "VEHICLE_ENTRY", "vehicleId": "...", "notes": "opcional" }`
(o VEHICLE_EXIT). Devuelve el evento persistido con `id`, `complexId`, `vehicleId`,
`visitorAuthorizationId`, `type`, `registeredById`, `timestamp` y `notes`.
Solo admite vehículos ACTIVE del conjunto: inactivo, ausente o ajeno devuelve
404 con el mismo mensaje. Tipo inválido o recurso requerido omitido: 400.
ADMIN/SECURITY pueden registrar y listar; 401/403 siguen las mismas reglas JWT/rol.
El flujo VISITOR_ENTRY/VISITOR_EXIT y el shape de GET permanecen vigentes:
GET devuelve un array con relaciones `vehicle`, `visitorAuthorization.visitor`
y `registeredBy` (nombre y apellido), ordenado por timestamp descendente.
Una autorización inexistente da 404; una entrada fuera de vigencia o salida sin
estado INSIDE da 400. No se añade una regla de alternancia entrada/salida de vehículos.

Los errores conservan el filtro global: `statusCode`, `message` (texto o array de
validaciones), `error`, `path`, `timestamp`. Para comprobar aislamiento consulte
`ABC223` con seguridad1 (404); sin Authorization obtendrá 401 y con
`residente11@parkly.test` obtendrá 403 en lookup y eventos.

### Pruebas y diagnóstico

`corepack pnpm test` ejecuta también las suites existentes de autenticación y tenant.
`corepack pnpm test -- vehicles.integration` verifica la consulta con JWT/guards
reales y el recorrido de acceso. Use una base demo recién migrada y con seed;
las nuevas fixtures y eventos de esa suite se eliminan al finalizar.
GitHub Actions ejecuta instalación congelada, generación Prisma, migraciones,
seed, pruebas y build en push y pull_request con PostgreSQL aislado.

- Error de conexión: `docker compose ps` y `docker compose logs postgres`;
  compruebe DATABASE_URL y disponibilidad de 5432. En Windows, si Prisma falla con localhost aunque Docker esté saludable, use 127.0.0.1 y connect_timeout=30 en DATABASE_URL (valores de .env.example).
- Cliente Prisma ausente: `corepack pnpm prisma:generate`.
- Tablas ausentes: `corepack pnpm prisma:deploy`, después `corepack pnpm prisma:seed`.
- 401: vuelva a hacer login; 403: revise rol y conjunto; 404 en lookup puede ser
  una placa de otro conjunto y no debe revelar su existencia.
- Puerto 4000 ocupado: detenga solo el proceso de esta API o cambie PORT en `.env`.
- `start:prod` usa `dist/src/main.js`, salida real de este tsconfig (incluye prisma/seed.ts).
- `test:e2e` es un script previo que apunta a `test/jest-e2e.json`, archivo inexistente;
  use `pnpm test` para las suites de integración disponibles.

### Revisión y recuperación

Base del diagnóstico: `95a1f391ebe82b72826254ff64a5a6c03d9b8378`.
La rama `feature/security-vehicle-lookup` conserva dos cortes: consulta y pruebas;
luego recorrido de eventos, CI y documentación. Use `git log --oneline` y
`git show <sha>` para revisarlos. Para recuperar un cambio compartido use
`git revert <sha>` (primero el segundo corte si revierte ambos), resuelva conflictos
y repita pruebas/build. No se modificó el esquema ni se requieren rollback de datos
para estos commits. Si se solicita revisión de otro integrante del equipo, debe registrarse
con su identidad y observaciones en el PR; una revisión automatizada no sustituye
esa aprobación humana.

En esta entrega el autor trabaja solo y pidió omitir la revisión de otro usuario de GitHub. No se afirma una aprobación humana externa.
