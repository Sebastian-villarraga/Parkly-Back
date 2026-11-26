# Despliegue conjunto en EC2 (Ubuntu)

Nginx sirve los archivos estáticos del frontend y envía `/api/` y `/docs` al backend NestJS, que systemd mantiene en `127.0.0.1:4000`. El cliente web debe usar rutas relativas como `/api/v1`; así front y API comparten origen y no requieren CORS en el navegador.

## Preparar el backend

Instale Node.js 22 LTS, habilite Corepack y use pnpm 9.15.4. Copie este repositorio a `/opt/parkly/backend` y configure el usuario de servicio:

```bash
sudo useradd --system --home /opt/parkly --shell /usr/sbin/nologin parkly
sudo mkdir -p /opt/parkly/backend /etc/parkly
sudo chown -R parkly:parkly /opt/parkly
```

En `/etc/parkly/backend.env`, configure los valores de producción (sin subirlos al repositorio):

```dotenv
NODE_ENV=production
HOST=127.0.0.1
PORT=4000
TRUST_PROXY=1
DATABASE_URL=postgresql://USER:PASSWORD@DB_HOST:5432/parkly?schema=public
JWT_SECRET=REPLACE_WITH_A_RANDOM_SECRET_OF_AT_LEAST_32_CHARACTERS
JWT_REFRESH_SECRET=REPLACE_WITH_A_DIFFERENT_RANDOM_SECRET_OF_AT_LEAST_32_CHARACTERS
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=https://YOUR_DOMAIN
```

Proteja el archivo, instale dependencias, compile y aplique las migraciones Prisma contra la base de datos de producción:

```bash
sudo chown root:parkly /etc/parkly/backend.env
sudo chmod 640 /etc/parkly/backend.env
cd /opt/parkly/backend
sudo -u parkly corepack pnpm install --frozen-lockfile
sudo -u parkly corepack pnpm prisma:generate
sudo -u parkly corepack pnpm build
```

`TRUST_PROXY=1` permite que los límites de solicitudes usen la IP real que Nginx reenvía; úselo solo cuando el backend no sea accesible directamente desde Internet.

Ejecute las migraciones de producción con una unidad de una sola ejecución que lee el mismo archivo protegido:

```bash
sudo cp deploy/systemd/parkly-migrate.service deploy/systemd/parkly-back.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl start parkly-migrate
sudo systemctl status parkly-migrate --no-pager
```

No use `prisma:migrate` ni `prisma:seed` en producción. Después de que las migraciones terminen correctamente, active la API:

```bash
sudo systemctl enable --now parkly-back
sudo systemctl status parkly-back --no-pager
```

La unidad asume que Node está en `/usr/bin/node`. Si la instalación de Node usa otra ruta, actualice `ExecStart` antes de activarla.

## Publicar el frontend con Nginx

Copie el build de producción del frontend a `/var/www/parkly/front/dist`. Si el framework genera otra carpeta, ajuste `root` en `deploy/nginx/parkly.conf`. Configure la URL base de la API del frontend como `/api/v1` (sin `localhost` ni puerto).

```bash
sudo apt-get update
sudo apt-get install -y nginx
sudo cp deploy/nginx/parkly.conf /etc/nginx/sites-available/parkly
sudo ln -s /etc/nginx/sites-available/parkly /etc/nginx/sites-enabled/parkly
sudo nginx -t
sudo systemctl reload nginx
```

Configure el DNS del dominio hacia la instancia y añada HTTPS (por ejemplo, con Certbot). En el Security Group de EC2 exponga solo SSH administrativo y los puertos 80/443; no exponga públicamente 4000 ni PostgreSQL. Restrinja también el acceso a la base de datos al servidor de la aplicación.

Verifique `http://YOUR_DOMAIN/api/v1` y `http://YOUR_DOMAIN/docs`. La API no define una ruta raíz `/`; un `404` en `/api/v1` puede ser normal, mientras que Swagger debe responder en `/docs`.
