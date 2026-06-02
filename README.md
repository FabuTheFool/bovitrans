# BoviTrans — MVP

Plataforma logística para la gestión del transporte terrestre de ganado vacuno.

> Prueba técnica Senior — Desarrollo asistido por IA.
> Ver [`BACKLOG.md`](BACKLOG.md) para el discovery completo.
> Ver [`DOCUMENTACION.md`](DOCUMENTACION.md) para la documentación técnica (Fase 4).

---

## Estado del desarrollo

| Fase | Entregable | Estado |
|---|---|---|
| Fase 1 | Discovery, skill de IA, backlog | ✅ Completada |
| Fase 2 | Modelo SQL + docker-compose + init.sql | ⏳ En progreso |
| Fase 3 | Aplicación Next.js (API + UI + mapas) | ⏳ Pendiente |
| Fase 4 | DOCUMENTACION.md + PR final | ⏳ Pendiente |

---

## Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Mapas:** Leaflet + react-leaflet + OpenStreetMap + OSRM
- **Backend:** Next.js Route Handlers (`app/api`)
- **Base de datos:** PostgreSQL 16
- **Infraestructura:** docker-compose

---

## Cómo correrlo

> Requisitos: Docker Desktop instalado.

```bash
cp .env.example .env
docker-compose up --build
```

La app queda disponible en `http://localhost:3000`.

---

## Documentos del proyecto

- [`BACKLOG.md`](BACKLOG.md) — Discovery completo (épicas, US, criterios Gherkin, tareas).
- [`CLAUDE.md`](CLAUDE.md) — Instrucciones operativas para Claude Code en este repo.
- [`.claude/skills.json`](.claude/skills.json) — Skill formal de Analista + Arquitecto BoviTrans.
- [`DOCUMENTACION.md`](DOCUMENTACION.md) — Documentación técnica (a generar en Fase 4).
