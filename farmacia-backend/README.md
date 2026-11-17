# Sistema de GestiÃ³n de Farmacia API

Backend REST en Node.js, Express y PostgreSQL para la administraciÃ³n de medicamentos, control de inventario y ofertas en farmacias.

## Requisitos

- Node.js 18+
- PostgreSQL 14+

## InstalaciÃ³n

```bash
npm install
npm run seed            # Carga datos iniciales en PostgreSQL
npm run migrate:ventas  # Agrega ventas/pagos sobre una base existente (incremental)
npm start               # Inicia el servidor en http://localhost:3001
```

> Si ya tienes la base `farmacia` en uso, ejecuta solo `npm run migrate:ventas`.
> No apliques `001_schema.sql` sobre una base con datos: ese archivo es el esquema completo para una base nueva.

Modo desarrollo con recarga automÃ¡tica:

```bash
npm run dev
```

## DocumentaciÃ³n OpenAPI

- **Swagger UI:** http://localhost:3001/api/docs
- **Spec YAML:** http://localhost:3001/api/docs/openapi.yaml

## Usuario demo

| Campo      | Valor           |
|------------|-----------------|
| Email      | demo@agenda.com |
| ContraseÃ±a | demo1234        |
| Rol        | admin           |

## Endpoints

### AutenticaciÃ³n (`/api/auth`)

| MÃ©todo | Ruta            | AutenticaciÃ³n | DescripciÃ³n              |
|--------|-----------------|---------------|--------------------------|
| POST   | `/register`     | No            | Registrar usuario        |
| POST   | `/login`        | No            | Iniciar sesiÃ³n           |
| GET    | `/me`           | SÃ­            | Perfil del usuario       |
| PUT    | `/me`           | SÃ­            | Actualizar perfil        |
| PUT    | `/me/password`  | SÃ­            | Cambiar contraseÃ±a       |

### Medicamentos (`/api/medicamento`)

| MÃ©todo | Ruta     | AutenticaciÃ³n        | DescripciÃ³n                        |
|--------|----------|----------------------|------------------------------------|
| GET    | `/`      | No                   | Listar (bÃºsqueda, filtros, paginaciÃ³n) |
| GET    | `/:id`   | No                   | Detalle de un medicamento          |
| POST   | `/`      | admin / regente      | Registrar un medicamento           |
| PUT    | `/:id`   | admin / regente      | Actualizar un medicamento          |
| DELETE | `/:id`   | admin / regente      | Eliminar un medicamento            |

### CategorÃ­as (`/api/categoria`)

| MÃ©todo | Ruta     | AutenticaciÃ³n        | DescripciÃ³n              |
|--------|----------|----------------------|--------------------------|
| GET    | `/`      | No                   | Listar categorÃ­as        |
| GET    | `/:id`   | No                   | Detalle de categorÃ­a     |
| POST   | `/`      | admin / regente      | Crear categorÃ­a          |
| PUT    | `/:id`   | admin / regente      | Actualizar categorÃ­a     |
| DELETE | `/:id`   | admin / regente      | Eliminar categorÃ­a       |

### Ofertas (`/api/oferta`)

| MÃ©todo | Ruta         | AutenticaciÃ³n        | DescripciÃ³n                          |
|--------|--------------|----------------------|--------------------------------------|
| GET    | `/`          | No                   | Listar ofertas                       |
| GET    | `/activas`   | No                   | Ofertas activas                      |
| GET    | `/:id`       | No                   | Detalle de oferta                    |
| POST   | `/`          | admin / regente      | Crear oferta                         |
| PUT    | `/:id`       | admin / regente      | Actualizar oferta                    |
| DELETE | `/:id`       | admin / regente      | Eliminar oferta                      |

### Ventas (`/api/venta`)

| MÃ©todo | Ruta                              | AutenticaciÃ³n              | DescripciÃ³n                              |
|--------|-----------------------------------|----------------------------|------------------------------------------|
| GET    | `/`                               | No                         | Listar ventas con filtros                |
| GET    | `/metodos-pago`                   | No                         | MÃ©todos de pago activos                 |
| GET    | `/cliente/:idCliente`             | No                         | Ventas de un cliente                     |
| GET    | `/:id`                            | No                         | Detalle de venta con pagos               |
| GET    | `/:id/comprobante`                | No                         | Comprobante de venta                     |
| POST   | `/`                               | admin / regente / vendedor | Crear venta (FEFO, receta y alergias)    |
| POST   | `/:id/pagos`                      | admin / regente / vendedor | Registrar pago                           |
| PATCH  | `/:id/pagos/:idPago/anular`       | admin / regente / vendedor | Anular pago                              |
| PATCH  | `/:id/anular`                     | admin / regente / vendedor | Anular venta y restaurar stock           |

Las ventas descuentan stock por lote siguiendo FEFO. Los pagos no se eliminan: se anulan.
La anulaciÃ³n de una venta restaura las cantidades en `inventario` y sincroniza `medicamento.stock`.

## AutenticaciÃ³n

Tras el login, incluir el token JWT en cada peticiÃ³n:

```
Authorization: Bearer <token>
```

## Ejemplo rÃ¡pido

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@agenda.com","password":"demo1234"}'

# Listar categorÃ­as
curl http://localhost:3001/api/categoria \
  -H "Authorization: Bearer <TOKEN>"

# Crear categorÃ­a (admin o regente)
curl -X POST http://localhost:3001/api/categoria \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"nombre":"AnalgÃ©sicos","descripcion":"Medicamentos para el dolor"}'
```

## Estructura del proyecto

```
src/
â”œâ”€â”€ app.js              # ConfiguraciÃ³n Express + Swagger
â”œâ”€â”€ server.js           # Punto de entrada
â”œâ”€â”€ controllers/        # Controladores HTTP
â”œâ”€â”€ services/           # LÃ³gica de negocio
â”œâ”€â”€ routes/             # Rutas REST
â”œâ”€â”€ middleware/         # Auth (JWT), roles, errores
â”œâ”€â”€ validators/         # ValidaciÃ³n de entrada
â””â”€â”€ db/
    â”œâ”€â”€ db.js           # Pool de conexiÃ³n PostgreSQL
    â”œâ”€â”€ seed.js         # Datos iniciales
    â””â”€â”€ migrations/     # Script SQL del esquema
openapi.yaml            # EspecificaciÃ³n OpenAPI 3.0
```

## Variables de entorno

| Variable     | Default           | DescripciÃ³n                       |
|--------------|-------------------|-----------------------------------|
| PORT         | 3001              | Puerto del servidor               |
| NODE_ENV     | development       | Entorno de ejecuciÃ³n              |
| DB_HOST      | localhost         | Host de PostgreSQL                |
| DB_PORT      | 5432              | Puerto de PostgreSQL              |
| DB_NAME      | farmacia          | Base de datos                     |
| DB_USER      | postgres          | Usuario de PostgreSQL             |
| DB_PASSWORD  | -                 | ContraseÃ±a de PostgreSQL          |
| JWT_SECRET   | -                 | Secreto para firmar tokens JWT (obligatorio en .env) |

