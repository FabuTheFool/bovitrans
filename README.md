# BoviTrans — MVP

Plataforma logística para la gestión del transporte terrestre de ganado vacuno.
Digitaliza el flujo de **solicitudes → asignación de camión → cálculo de costo de
combustible**, con mapas interactivos, alertas de sobrecapacidad y auditoría de
parámetros.

> Entregable de prueba técnica senior — Desarrollo asistido por IA.

---

## Estado de la entrega

| Fase | Entregable | Estado |
|---|---|---|
| 1 | Discovery con Claude: `.claude/skills.json`, `CLAUDE.md`, `BACKLOG.md` | ✅ |
| 2 | Modelo SQL + docker-compose + `init.sql` con seed | ✅ |
| 3 | App Next.js 14 (API REST + UI + Leaflet/OSRM) | ✅ |
| 4 | `DOCUMENTACION.md` riguroso + PR a `main` | ✅ |
| 5 (extra) | Autenticación JWT + RBAC operador/admin | ✅ |

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| Mapas | Leaflet + react-leaflet + tiles OSM + routing OSRM + geocoding Nominatim |
| Backend | Next.js Route Handlers (`app/api/**`) |
| Validación | Zod (compartida cliente/servidor) |
| Base de datos | PostgreSQL 16 con `node-postgres` (sin ORM) |
| Auth | `jose` (JWT HS256) + cookie httpOnly + `bcryptjs` (cost 12) |
| Tests | Vitest (lógica de dominio pura) |
| Infraestructura | docker-compose (servicios `app` + `db` separados) |

---

## Cómo correrlo

### Requisitos
- Docker Desktop (probado con 29.x)
- (Opcional) Node.js 20+ para correr tests de dominio sin contenedor

### Pasos

```bash
# 1. Clonar
git clone https://github.com/FabuTheFool/bovitrans.git
cd bovitrans

# 2. Configurar entorno
cp .env.example .env

# 3. Generar un JWT_SECRET único (obligatorio — compose falla sin él)
#    Linux/Mac:
#    openssl rand -base64 48
#    Windows PowerShell:
#    [Convert]::ToBase64String([byte[]](1..36 | ForEach-Object { Get-Random -Maximum 256 }))
#    Pegá el valor resultante en .env reemplazando CHANGE_ME_run_openssl_rand_base64_48

# 4. Levantar
docker compose up --build
```

La app queda disponible en **http://localhost:3000**.
La DB se expone sólo a localhost en `127.0.0.1:5432` (para debugging con psql/DBeaver).

### Credenciales de demo (seed automático)

| Email | Password | Rol |
|---|---|---|
| `admin@bovitrans.local` | `BoviTrans2026!` | admin |
| `operador@bovitrans.local` | `Operador2026!` | operador |

---

## Verificación rápida

```bash
# Health probe (público, no requiere auth)
curl http://localhost:3000/api/healthz

# Login (guarda cookie en jar.txt)
curl -c jar.txt -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@bovitrans.local","password":"BoviTrans2026!"}'

# Endpoints protegidos: usar la cookie
curl -b jar.txt http://localhost:3000/api/trucks
curl -b jar.txt http://localhost:3000/api/transport-requests
curl -b jar.txt http://localhost:3000/api/settings/fuel-price
```

Output esperado del último: `{"data":{"amount":8000,"currency":"PYG"}}`.

---

## Funcionalidades principales

- **Dashboard** (`/`) — solicitudes de transporte en grid, filtro por estado, contadores, costos en PYG.
- **Nueva solicitud** (`/requests/new`) — formulario con `MapPicker` (click + geocoding Nominatim) para definir origen/destino. La ruta se calcula vía OSRM al guardar.
- **Detalle de solicitud** (`/requests/:id`) — mapa interactivo con la ruta real, métricas (distancia, tiempo), acciones contextuales por estado.
- **Asignación de camión** (`/requests/:id/assign`) — selector con **cálculo de costo en vivo** por camión, `CapacityAlert` con sugerencias (dividir en N viajes o reasignar), doble confirmación modal si hay sobrecapacidad.
- **Flota** (`/fleet`) — registro y listado de camiones con campos críticos inmutables (patente, capacidad, consumo) protegidos por trigger en DB.
- **Configuración** (`/settings`) — precio del combustible (solo admin) con historial auditable.

---

## Reglas de negocio implementadas

- **Costo combustible** = `distancia_km × consumo_l_km × precio_litro` (snapshot persistido al asignar).
- **Sobrecapacidad** permitida con confirmación explícita; queda registrada con `con_sobrecapacidad=true` para auditoría.
- **Inmutabilidad del camión**: patente, capacidad y consumo no editables post-creación (enforced por trigger PL/pgSQL).
- **Patente única**: normalizada (uppercase + sin espacios) vía `GENERATED COLUMN` + `UNIQUE INDEX`.
- **Una asignación activa por solicitud y por camión**: `UNIQUE INDEX` parcial `WHERE estado='activa'`.
- **Snapshot de precios**: cambiar el precio del combustible no altera costos históricos.

Más detalle en [`DOCUMENTACION.md`](DOCUMENTACION.md) §5 y [`BACKLOG.md`](BACKLOG.md) §4.

---

## Documentos del proyecto

- [`BACKLOG.md`](BACKLOG.md) — Discovery completo: 7 épicas, 21 user stories con criterios Gherkin (mínimo 2 escenarios por US), tareas técnicas por capa, matriz de dependencias, roadmap de sprints, trace de prompts usados con Claude.
- [`DOCUMENTACION.md`](DOCUMENTACION.md) — Arquitectura general con diagrama de componentes, ERD en Mermaid, tabla de endpoints REST, sección de auth/RBAC, 8 ADR-lite con trade-offs.
- [`CLAUDE.md`](CLAUDE.md) — Instrucciones operativas que Claude Code carga automáticamente al iniciar sesión en este repo.
- [`.claude/skills.json`](.claude/skills.json) — Skill formal de Analista de Negocios + Arquitecto de Software, con persona, glosario, invariantes y formatos de output.

---

## Tests

```bash
npm install
npm test        # dominio puro: cost + capacity
npm run typecheck
```

15 tests, 0 fallos. Cubren cálculo de costo (caso nominal, redondeo, edge cases), evaluación de sobrecapacidad (igualdad exacta, masiva, sugerencias) y validación de inputs.

---

## Limpieza

```bash
docker compose down       # preserva volumen de DB
docker compose down -v    # también borra el volumen → próximo up corre init.sql limpio
```
