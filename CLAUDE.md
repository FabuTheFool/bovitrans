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

## 6. Design system & filosofía UX

> Este proyecto tiene un design system propio (no shadcn/ui copy-paste).
> Cualquier nueva UI debe respetar estas convenciones para mantener coherencia.

### 6.1 Filosofía rectora — "Invisible UX"

La interfaz se ignora si el usuario solo quiere completar su tarea; los gestos avanzados aparecen para quien los busca. Reglas concretas:

- **Menos color, más jerarquía**. Los gradients estridentes en textos y botones primarios son anti-pattern. Usar gradient solo en superficies estructurales (aurora background, sidebar header overlay) o atmosféricas (glow detrás del logo en login).
- **Un click resuelve, no un menú**. Theme toggle, modo selección, ajustes binarios: botón único con animación de icono. Sin dropdowns innecesarios.
- **Composabilidad sobre destrucción**. Gestos como el chord click son **aditivos** (suman al estado actual) y reversibles vía toggle. ESC siempre limpia.
- **Discoverable cuando se busca, invisible cuando no**. Lightbulb floating + atajo `?` para shortcuts. La UI no enseña; deja que el usuario explore.
- **Iteración sobre feedback inmediato**. Si algo "se ve overdone" o "muy invasivo" → cambiar opacidad/saturación antes de cambiar la estructura. La estructura debe sobrevivir muchas iteraciones de tweaking visual.

### 6.2 Tokens y paleta (`app/globals.css`)

Paleta derivada del logo: **violeta** (`hsl(261 38% 52%)`) + **teal** (`hsl(173 65% 42%)`). Tokens semánticos HSL:

```
--primary       violeta del logo (suavizado para no fatigar)
--accent        teal del toro (usado como complemento)
--success       verde
--warning       ámbar
--info          azul (para status en_curso — NO chocar con success)
--destructive   rojo

Cada uno con variante `-soft` (versión muy clara para chips/badges).
Light y dark con valores HSL distintos para mantener contraste.
```

Background tintado (no blanco puro / no black neutro):
- Light: `hsl(270 30% 99%)` (warm-violet sutil)
- Dark: `hsl(260 25% 7%)` (zinc azulado profundo con hint violeta)

### 6.3 Utilidades de superficie

```css
.glass         /* backdrop-blur 16px + bg semi-transparente + tinte sutil */
.glass-strong  /* blur 20px + más opacidad + sombra tintada violeta */
.bg-brand-gradient    /* violeta → teal (SOLO superficies estructurales) */
.text-brand-gradient  /* USAR CON MEDIDA — al usuario no le gusta overdone */
```

Aurora background: 4 orbes radiales blureados a 70px fijos al viewport, definidos en `body::before`. Más intensos en light (porque hay menos contraste de fondo).

### 6.4 Componentes UI (`components/ui/*`)

Construidos sobre Radix primitives + `cva` para variants tipadas + `tailwind-merge` (via `cn()` en `lib/utils.ts`). NO usar otros componentes de librerías externas sin pedir.

| Componente | Variants | Notas |
|---|---|---|
| `Button` | default, destructive, outline, secondary, ghost, link, accent | Soporta `asChild` para usar como Link wrapper |
| `Card` | solid, glass, plain | Default es `glass` |
| `Badge` | default, secondary, accent, destructive, success, warning, outline, muted | Sumar `info` si hace falta |
| `Dialog` | — | Z-index `z-[1000]+` (por encima de Leaflet) |
| `DropdownMenu` | — | Z-index igual |
| `Tooltip` | — | Provider en sidebar para items colapsados |
| `Input`, `Label` | — | Usar `htmlFor`/`id` siempre (a11y) |
| `Skeleton` | — | `bg-muted/60` con pulse |

### 6.5 Layout y navegación

- **Sidebar colapsable** (`components/Sidebar.tsx` + `SidebarContext.tsx`):
  - 280px expandido ↔ 72px colapsado
  - Estado persistido en `localStorage` key `bvt:sidebar:collapsed`
  - Tooltips Radix solo cuando colapsado (labels visibles cuando expandido)
- **MobileTopbar** drawer animado con framer-motion para < md
- **Theme toggle**: 1-click directo (resolvedTheme), sin opción "sistema"

### 6.6 Patrones de UI específicos

- **Status chips** (`components/StatusChip.tsx`): icono Lucide + color semántico + ring inset. NO solo color (a11y).
- **Page loading**: cada ruta importante tiene `loading.tsx` con skeletons que mimean la estructura.
- **Modales**: SIEMPRE Radix Dialog vía `components/Modal.tsx` (`ConfirmModal`, `PromptModal`). NUNCA `confirm()`/`prompt()` nativos.
- **Toasts**: `sonner` (configurado en `providers.tsx`). Usar `toast.success/error/info`. NO inline error banners salvo casos de form validation.
- **A11y mínima obligatoria**: `htmlFor`/`id` en inputs, `aria-invalid`, `aria-describedby`, `role="alert"` en mensajes de error, focus rings visibles, navegación por teclado.

### 6.7 Vocabulario de gestos del dashboard

Si tocás el dashboard o cards de solicitudes, estos gestos están implementados (`DashboardClient.tsx`):

| Gesto | Acción |
|---|---|
| Click en card (en select mode) | Toggle individual + update anchor |
| Shift + click | Range desde anchor (estilo file manager) |
| Click izq + click der sobre card | Toggle aditivo todas las del mismo estado |
| Drag rectangle (cualquier zona vacía) | Marquee selection |
| Shift + drag | Suma al rango actual |
| Triple-click vacío | Seleccionar todas |
| Doble-click vacío | Limpiar selección |
| Doble-click en card sin selección activa | Abrir detalle |
| ESC | Salir del modo selección |
| `?` | Abrir / cerrar shortcuts dialog |

Cualquier nuevo gesto debe respetar:
- Threshold de 4px antes de iniciar drag
- Suprimir click sintético post-drag vía capture phase
- `data-no-drag` en elementos chicos interactivos (pencil icon, etc.) para que no inicien drag
- ESC siempre cierra/sale/limpia

### 6.8 Lecciones de iteración (no rehacer estos errores)

- ❌ Gradients en textos `<h1>` o botones primarios → ✅ texto sólido sobre bg tintado
- ❌ Botones de modo selección con violeta sólido → ✅ outline + glass + borde sólido visible
- ❌ Status `en_curso` con teal/accent → ✅ blue (`info` token), no chocaba con success verde
- ❌ Checkbox de selección encima del StatusChip → ✅ esquina top-left flotando como sticker
- ❌ Cards solo arrastrables entre cards → ✅ listener global en `document` con exclusiones marcadas
- ❌ Chord click reemplaza selección → ✅ aditivo + toggle por categoría

---

## 7. Flujos comunes

**Agregar una nueva US al backlog:**
> Activá el skill `bovitrans-analyst` y generá la US con AC Gherkin (mínimo 2 escenarios) y tareas por capa. Confirmá que cumple los quality gates definidos en el skill.

**Implementar lógica de cálculo:**
> Escribí la función pura en `lib/domain/`, con su test unitario. Luego expuesta vía API y consumida desde la UI.

**Modificar el modelo de datos:**
> Agregá una migration nueva en `db/migrations/`. Nunca edites `init.sql` retroactivamente: representa el estado inicial del MVP.

---

## 8. Lo que NO debe hacer Claude en este repo

- Proponer ORMs pesados sin pedirlo: el ejercicio premia el dominio de SQL.
- Inventar campos no documentados en `BACKLOG.md` o `skills.json`.
- Saltarse la fase de validación con Zod en boundaries.
- Hacer commits sin Conventional Commits.
- Tocar `init.sql` después del primer seed estable; usar migrations.
- Aplicar gradients estridentes en textos o botones primarios (ver §6.1).
- Importar librerías de componentes (shadcn, Mantine, MUI) sin pedir — el design system propio en `components/ui/*` debe extenderse, no reemplazarse.
- Usar `confirm()`, `prompt()` o `alert()` nativos — usar `ConfirmModal` / `PromptModal` / `toast`.
- Romper la composabilidad de gestos: gestos nuevos deben ser aditivos / toggleables, nunca destructivos sin confirmación.
