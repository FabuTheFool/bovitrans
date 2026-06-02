# CLAUDE.md — Instrucciones operativas del proyecto BoviTrans

> Este archivo es leído automáticamente por Claude Code al iniciar una sesión en este repositorio.
> Define cómo Claude debe asistir en el desarrollo del MVP BoviTrans.
> Complementa al skill formal en [`.claude/skills.json`](.claude/skills.json).

---

## 1. Contexto del producto

**BoviTrans** es una plataforma logística para el transporte terrestre de ganado vacuno. El MVP cubre:

- Dashboard de solicitudes de transporte (con mapa y costeo dinámico).
- Administración de flota de camiones.
- Asignación camión ↔ solicitud con cálculo automático de costo de combustible y alertas de sobrecapacidad.

Lee la [pauta original](#) y el [`BACKLOG.md`](BACKLOG.md) antes de proponer cambios estructurales.

---

## 2. Stack y convenciones

| Capa | Decisión |
|---|---|
| Frontend | Next.js 14 App Router, TypeScript, Tailwind |
| Mapas | Leaflet + react-leaflet + tiles OSM, routing OSRM |
| Backend | Next.js Route Handlers (`app/api`) |
| DB | PostgreSQL 16 con `pg` (sin ORM) |
| Validación | Zod compartido cliente/servidor |
| Infra | docker-compose: servicios `app` + `db`, volumen nombrado |
| Commits | Conventional Commits |
| Branches | `feature/*`, `fix/*`, `docs/*` |

---

## 3. Reglas duras (no negociables)

1. **Campos inmutables del Camión:** `patente`, `capacidad_max`, `consumo_l_km`. Sólo se permite cambiar `estado` (activo/inactivo).
2. **Snapshot de costo:** cada asignación persiste `precio_litro_aplicado` y `costo_total_calculado`. Nunca se recalculan retroactivamente.
3. **Patente única y normalizada:** uppercase, sin espacios, validada en cliente y servidor.
4. **Sobrecapacidad:** se permite asignar pero se emite alerta + sugerencia de viajes múltiples. No se bloquea silenciosamente.
5. **Códigos HTTP correctos:** `201` en creación, `204` en delete, `409` en violación de invariante, `422` en regla de negocio.

---

## 4. Estructura del repositorio

```
.
├── .claude/
│   └── skills.json              # Definición del skill (Analista + Arquitecto)
├── app/                         # Next.js App Router
│   ├── (dashboard)/             # Vistas operativas
│   ├── api/                     # Route Handlers REST
│   └── layout.tsx
├── components/                  # Componentes React reutilizables
├── lib/                         # Lógica de dominio, db, validators
│   ├── db/                      # Cliente pg + queries
│   ├── domain/                  # Cálculos puros (costo, capacidad)
│   └── validators/              # Schemas Zod compartidos
├── db/
│   ├── init.sql                 # Schema + seed (entry point del contenedor db)
│   └── migrations/              # Migrations posteriores al MVP
├── docker-compose.yml
├── Dockerfile
├── BACKLOG.md                   # Entregable Fase 1
├── DOCUMENTACION.md             # Entregable Fase 4
└── CLAUDE.md
```

---

## 5. Cómo asistir en este proyecto

Al iniciar una sesión, Claude debe:

1. Leer [`BACKLOG.md`](BACKLOG.md) para conocer el estado del discovery.
2. Consultar [`.claude/skills.json`](.claude/skills.json) cuando se pidan artefactos de discovery (épicas, US, AC, tasks).
3. Para cambios de código:
   - Validar contra las **invariantes** del skill antes de proponer una solución.
   - Sugerir tests cuando se toque lógica de dominio (`lib/domain/`).
   - Respetar la separación API ↔ lógica de dominio ↔ acceso a datos.
4. Para cambios de UI: priorizar prolijidad, accesibilidad básica (foco, contraste, aria), y feedback claro de errores/alertas.

---

## 6. Flujos comunes

**Agregar una nueva US al backlog:**
> Activá el skill `bovitrans-analyst` y generá la US con AC Gherkin (mínimo 2 escenarios) y tareas por capa. Confirmá que cumple los quality gates definidos en el skill.

**Implementar lógica de cálculo:**
> Escribí la función pura en `lib/domain/`, con su test unitario. Luego expuesta vía API y consumida desde la UI.

**Modificar el modelo de datos:**
> Agregá una migration nueva en `db/migrations/`. Nunca edites `init.sql` retroactivamente: representa el estado inicial del MVP.

---

## 7. Lo que NO debe hacer Claude en este repo

- Proponer ORMs pesados sin pedirlo: el ejercicio premia el dominio de SQL.
- Inventar campos no documentados en `BACKLOG.md` o `skills.json`.
- Saltarse la fase de validación con Zod en boundaries.
- Hacer commits sin Conventional Commits.
- Tocar `init.sql` después del primer seed estable; usar migrations.
