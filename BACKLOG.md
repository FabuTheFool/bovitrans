# BACKLOG.md — MVP BoviTrans

> **Entregable de la Fase 1** de la prueba técnica.
> Discovery completo del producto: visión, actores, glosario, invariantes, épicas,
> historias de usuario con criterios de aceptación Gherkin y tareas técnicas,
> matriz de dependencias, roadmap sugerido y trace de prompts usados con Claude.
>
> Generado en colaboración con el skill [`bovitrans-analyst`](.claude/skills.json).

---

## Índice

1. [Visión y alcance del MVP](#1-visión-y-alcance-del-mvp)
2. [Actores y roles](#2-actores-y-roles)
3. [Glosario de dominio](#3-glosario-de-dominio)
4. [Invariantes y reglas de negocio](#4-invariantes-y-reglas-de-negocio)
5. [Épicas](#5-épicas)
6. [Historias de Usuario](#6-historias-de-usuario)
7. [Matriz de dependencias entre US](#7-matriz-de-dependencias-entre-us)
8. [Roadmap sugerido por sprint](#8-roadmap-sugerido-por-sprint)
9. [Trace de prompts utilizados con Claude](#9-trace-de-prompts-utilizados-con-claude)

---

## 1. Visión y alcance del MVP

**Visión:** BoviTrans digitaliza la coordinación de traslados terrestres de ganado vacuno, eliminando errores de cálculo de costos y capacidades que hoy se gestionan a mano por operadores logísticos.

**Problema a resolver:** Los traslados se planifican con planillas y memoria del operador. Esto genera (a) errores de capacidad (asignar un camión que no entra el ganado), (b) errores de costeo (calcular mal el combustible), (c) falta de trazabilidad del trabajo asignado.

**Alcance del MVP (in-scope):**

- Registro y listado de solicitudes de transporte.
- Registro y listado de camiones de la flota.
- Asignación de un camión a una solicitud, con cálculo automático de costo de combustible.
- Visualización geográfica del trayecto en mapa con distancia calculada.
- Alerta automática de sobrecapacidad con sugerencia de acción.
- Parametrización del precio de combustible por litro.

**Fuera de alcance del MVP (out-of-scope):**

- Notificaciones push o email al cliente.
- Facturación, pagos o integración contable.
- App móvil para el chofer.
- GPS en tiempo real del camión.
- Cálculo de peajes, viáticos o costo de chofer.
- Optimización multi-ruta (TSP / VRP).

**Métricas de éxito del MVP:**

- Tiempo promedio de armado de una asignación: < 60 segundos.
- Error de cálculo de combustible: 0 (vs. planilla manual).
- Asignaciones con sobrecapacidad sin alerta: 0.

---

## 2. Actores y roles

| Actor | Descripción | Interacción |
|---|---|---|
| **Operador Logístico** | Usuario primario del MVP. Gestiona solicitudes, flota y asignaciones desde el dashboard. | Todas las funcionalidades del MVP. |
| **Cliente Solicitante** | Persona física o jurídica que pide un traslado de ganado. _En el MVP no tiene acceso a la plataforma; su información se ingresa por el operador._ | Indirecta (a través del operador). |
| **Chofer** | Persona que conduce el camión asignado. _Fuera del alcance del MVP._ | N/A en este MVP. |
| **Administrador del Sistema** | Rol con privilegios elevados — gestiona parametrización global (precio del combustible, futuros parámetros). | Configuración del sistema (US-21). |

> **Nota arquitectónica:** El MVP implementa autenticación con JWT firmado del lado servidor (HS256) en cookie httpOnly. Roles `operador` y `admin` con RBAC sobre los endpoints que tocan parametrización (épica E07).

---

## 3. Glosario de dominio

| Término | Definición |
|---|---|
| **Solicitud de Transporte** | Pedido de un cliente para mover N cabezas de ganado entre un punto de origen y un punto de destino. |
| **Cabeza de ganado** | Unidad de carga animal. Entero ≥ 1. |
| **Camión / Vehículo** | Unidad de transporte. Tiene tres atributos críticos inmutables: patente, capacidad máxima y coeficiente de consumo. |
| **Patente / Matrícula** | Identificador único legal del vehículo. Inmutable. |
| **Capacidad máxima** | Cabezas que el vehículo puede transportar de forma segura en un único viaje. Entero ≥ 1. |
| **Coeficiente de consumo** | Litros consumidos por kilómetro recorrido (L/Km). Decimal > 0. |
| **Asignación** | Vínculo Solicitud ↔ Camión, en un momento dado. |
| **Costo de Combustible** | `Distancia (Km) × Consumo (L/Km) × Precio_litro` calculado al momento de asignar. |
| **Precio del Combustible** | Parámetro global editable. Cada asignación persiste el precio aplicado al momento. |
| **Sobrecapacidad** | Condición en la que `cabezas_solicitadas > capacidad_camión`. Permitida con alerta. |
| **Viaje** | En el MVP, un Viaje = una Asignación ejecutada. (La división en múltiples viajes para sobrecapacidad se modela como múltiples Solicitudes derivadas.) |
| **Estado de Solicitud** | Máquina de estados: `pendiente → asignada → en_curso → completada` (o `cancelada` desde cualquier estado no final). |
| **Estado de Camión** | `activo` o `inactivo`. Inactivo no puede recibir nuevas asignaciones. |

---

## 4. Invariantes y reglas de negocio

> Estas reglas son las que tensionan al sistema. Cada invariante está mapeada a al menos una US y a una restricción técnica.

### Invariantes de integridad

| ID | Invariante | Mecanismo de enforcement |
|---|---|---|
| **INV-01** | Patente, capacidad máxima y coeficiente de consumo de un camión son **inmutables** post-registro. | API: PATCH solo permite `estado`. DB: trigger que rechaza updates de campos críticos. |
| **INV-02** | La patente es única globalmente (normalizada: uppercase, sin espacios). | `UNIQUE INDEX` sobre `patente_normalizada`. |
| **INV-03** | Una Solicitud tiene como máximo **una** Asignación activa en un momento dado. | `UNIQUE INDEX` parcial sobre `(solicitud_id) WHERE estado = 'activa'`. |
| **INV-04** | Una Asignación persiste un **snapshot** del precio del litro y del costo total. Nunca se recalcula retroactivamente. | Columnas `precio_litro_aplicado`, `costo_combustible`, `distancia_km`, `consumo_aplicado` en `asignaciones`. |
| **INV-05** | `cantidad_cabezas`, `capacidad_max` son enteros ≥ 1. `consumo_l_km`, `distancia_km`, `precio_litro` son decimales > 0. | `CHECK` constraints en DB + Zod en API. |
| **INV-06** | Un camión `inactivo` no puede recibir nuevas asignaciones. | Validación de regla de negocio en endpoint de asignación → HTTP 422. |

### Reglas de negocio (configurables)

| ID | Regla | Configurabilidad |
|---|---|---|
| **BR-01** | Cuando `cabezas_solicitadas > capacidad_camión`, la asignación se permite pero se emite **alerta de sobrecapacidad**. Se sugiere `N = ceil(cabezas / capacidad)` viajes o reasignar a otro camión. | Hardcoded en MVP. |
| **BR-02** | El precio del combustible por litro es parámetro global editable. Se mantiene historial de cambios. | Editable vía UI. |
| **BR-03** | La distancia entre dos puntos se obtiene de un servicio de routing real (OSRM), no de fórmulas haversine, porque el ganado se traslada por rutas terrestres. | Hardcoded en MVP. |
| **BR-04** | Costo de combustible = `distancia_km × consumo_l_km × precio_litro`. Se redondea a 2 decimales en la persistencia. | Hardcoded. |

---

## 5. Épicas

### E01 — Gestión de Solicitudes de Transporte

**Objetivo de negocio:** Centralizar la recepción y seguimiento de pedidos de transporte en un único panel operativo, eliminando el uso de planillas.

**KPI:** 100% de las solicitudes operativas viven en el sistema (vs. en planillas/WhatsApp).

**US incluidas:** US-01, US-02, US-03, US-04, US-05.

---

### E02 — Administración de Flota Vehicular

**Objetivo de negocio:** Mantener un inventario fiable y trazable de los camiones de la empresa, con sus capacidades y consumos correctos.

**KPI:** 100% de los camiones de la flota registrados con datos válidos.

**US incluidas:** US-06, US-07, US-08, US-09.

---

### E03 — Geolocalización, Mapas y Rutas

**Objetivo de negocio:** Dar al operador soporte visual y métrico para entender el trayecto de cada solicitud antes de comprometer un recurso.

**KPI:** Tiempo de evaluación visual de una ruta < 10 segundos.

**US incluidas:** US-10, US-11, US-12.

---

### E04 — Asignación y Cálculo Logístico-Financiero

**Objetivo de negocio:** Automatizar el costeo y validar la capacidad al asignar camiones a solicitudes, eliminando errores manuales.

**KPI:** 0 asignaciones con error de cálculo de combustible. 0 asignaciones con sobrecapacidad silenciada.

**US incluidas:** US-13, US-14, US-15, US-16.

---

### E05 — Parametrización y Configuración del Sistema

**Objetivo de negocio:** Permitir mantener actualizado el precio del combustible sin tocar código, conservando trazabilidad histórica.

**KPI:** Tiempo para actualizar el precio del combustible < 30 segundos.

**US incluidas:** US-17, US-18.

---

### E06 — Plataforma e Infraestructura (Épica técnica)

**Objetivo:** Garantizar que el sistema arranca con un único comando, persiste datos correctamente y tiene un modelo de datos sólido.

**No tiene US tradicionales** — se descompone directamente en tareas técnicas (ver sección 8, sprint 0).

---

### E07 — Autenticación y Control de Acceso

**Objetivo de negocio:** Garantizar que sólo personal autorizado accede a la plataforma y que las acciones sensibles (modificar parámetros del sistema) están restringidas a roles administrativos.

**KPI:** 100% de los endpoints sensibles requieren sesión válida. 0 endpoints de mutación accesibles sin auth.

**US incluidas:** US-19, US-20, US-21.

---

## 6. Historias de Usuario

### Épica E01 — Gestión de Solicitudes de Transporte

---

#### US-01 — Listar solicitudes en el dashboard

> Como **Operador Logístico**, quiero **ver todas las solicitudes de transporte en un panel principal con filtros por estado**, para **tener una vista centralizada del trabajo pendiente y priorizar mi día**.

**Épica:** E01 · **Prioridad:** Must · **Estimación:** 5 pts

**Criterios de Aceptación:**

**Escenario 1: Dashboard con solicitudes pendientes**
```gherkin
Dado que existen 3 solicitudes en estado "pendiente" y 2 en estado "asignada"
Cuando el operador ingresa al dashboard
Entonces visualiza las 5 solicitudes en formato de tarjetas
Y cada tarjeta muestra: solicitante, cabezas, origen, destino, estado y fecha de creación
Y las tarjetas pendientes aparecen primero, ordenadas por fecha ascendente
```

**Escenario 2: Filtrado por estado**
```gherkin
Dado que el operador está en el dashboard
Cuando aplica el filtro de estado "pendiente"
Entonces sólo se muestran las solicitudes con estado "pendiente"
Y el contador en la cabecera refleja "3 solicitudes"
```

**Escenario 3: Dashboard vacío (edge case)**
```gherkin
Dado que no existen solicitudes en el sistema
Cuando el operador ingresa al dashboard
Entonces visualiza un estado vacío con copy "Aún no hay solicitudes registradas"
Y un CTA visible "Crear primera solicitud"
```

**Tareas técnicas:**

- [ ] **[DB]** Tabla `solicitudes` con campos: `id`, `solicitante_nombre`, `solicitante_contacto`, `cabezas`, `origen_lat`, `origen_lon`, `origen_label`, `destino_lat`, `destino_lon`, `destino_label`, `estado`, `created_at`, `updated_at`. _(US-01)_
- [ ] **[DB]** Índice sobre `(estado, created_at)` para listados paginados eficientes. _(US-01)_
- [ ] **[API]** `GET /api/transport-requests?estado=&page=&pageSize=` con paginación y filtros. _(US-01)_
- [ ] **[API]** Schema Zod de respuesta `TransportRequestListItemSchema`. _(US-01)_
- [ ] **[FE]** Componente `<RequestCard />` con estados visuales por status (chip de color). _(US-01)_
- [ ] **[FE]** Página `app/(dashboard)/page.tsx` con grid responsiva (1/2/3 columnas según breakpoint). _(US-01)_
- [ ] **[FE]** Componente `<StatusFilter />` con tabs y contador. _(US-01)_
- [ ] **[FE]** Empty state con CTA. _(US-01)_
- [ ] **[QA]** Test unitario del query de listado con orden por estado + fecha. _(US-01)_

---

#### US-02 — Registrar nueva solicitud de transporte

> Como **Operador Logístico**, quiero **registrar una nueva solicitud con los datos del cliente, cantidad de ganado y puntos geográficos de origen/destino**, para **incorporarla al flujo operativo**.

**Épica:** E01 · **Prioridad:** Must · **Estimación:** 8 pts
**Depende de:** US-11 (selección de puntos en mapa).

**Criterios de Aceptación:**

**Escenario 1: Creación exitosa**
```gherkin
Dado que el operador está en el dashboard
Cuando hace click en "Nueva solicitud"
Y completa: solicitante "Estancia La Paz", contacto "+598 99 123 456", cabezas 80
Y selecciona origen "Tacuarembó, UY" y destino "Florida, UY" desde el mapa
Y confirma con "Crear solicitud"
Entonces el sistema persiste la solicitud con estado "pendiente"
Y retorna HTTP 201 con el objeto creado
Y redirige al detalle de la solicitud recién creada
```

**Escenario 2: Validación de cabezas = 0**
```gherkin
Dado que el operador está completando el formulario de nueva solicitud
Cuando ingresa "0" en el campo cabezas
Entonces el campo muestra error "Debe haber al menos 1 cabeza"
Y el botón "Crear solicitud" queda deshabilitado
```

**Escenario 3: Origen y destino iguales (edge case)**
```gherkin
Dado que el operador selecciona el mismo punto como origen y destino
Cuando intenta confirmar
Entonces el sistema muestra error "El origen y el destino no pueden coincidir"
Y la solicitud NO se persiste
```

**Escenario 4: Servicio de routing caído (edge case)**
```gherkin
Dado que el servicio de routing OSRM no responde
Cuando el operador intenta crear la solicitud
Entonces el sistema persiste la solicitud sin distancia calculada (distancia_km = NULL)
Y emite un warning visible "Distancia no calculada — reintentar más tarde"
Y la solicitud queda igualmente en estado "pendiente"
```

**Tareas técnicas:**

- [ ] **[API]** `POST /api/transport-requests` con validación Zod (cabezas ≥ 1, coords válidas, origen ≠ destino). _(US-02)_
- [ ] **[API]** Manejo de error de routing externo: persistir con `distancia_km = NULL` y header `X-Routing-Status: failed`. _(US-02)_
- [ ] **[FE]** Página `app/(dashboard)/requests/new/page.tsx` con formulario controlado. _(US-02)_
- [ ] **[FE]** Componente `<MapPicker />` para seleccionar origen y destino (ver US-11). _(US-02)_
- [ ] **[FE]** Validación client-side (Zod en cliente) con feedback en tiempo real. _(US-02)_
- [ ] **[FE]** Toast de éxito + redirección al detalle. _(US-02)_
- [ ] **[QA]** Test E2E: creación happy path + validación de cabezas inválidas. _(US-02)_

---

#### US-03 — Ver detalle de una solicitud

> Como **Operador Logístico**, quiero **abrir el detalle completo de una solicitud incluyendo el mapa de la ruta**, para **entender el alcance del trabajo antes de asignar un camión**.

**Épica:** E01 · **Prioridad:** Must · **Estimación:** 5 pts

**Criterios de Aceptación:**

**Escenario 1: Detalle con ruta calculada**
```gherkin
Dado que existe una solicitud con distancia ya calculada (520 km)
Cuando el operador abre su detalle
Entonces ve los datos del solicitante, cabezas, origen, destino y estado
Y ve el mapa con la ruta trazada en color
Y ve la métrica "Distancia: 520 km"
Y ve un botón "Asignar camión" si el estado es "pendiente"
```

**Escenario 2: Detalle de solicitud no existente**
```gherkin
Dado que se navega a /requests/9999
Y no existe ninguna solicitud con id 9999
Cuando se carga la página
Entonces el sistema responde con HTTP 404
Y muestra una vista de "Solicitud no encontrada"
Y ofrece volver al dashboard
```

**Tareas técnicas:**

- [ ] **[API]** `GET /api/transport-requests/:id` con includes de camión asignado (si aplica). _(US-03)_
- [ ] **[FE]** Página `app/(dashboard)/requests/[id]/page.tsx`. _(US-03)_
- [ ] **[FE]** Componente `<RouteMap />` reutilizable (recibe origen + destino, dibuja ruta). _(US-03)_
- [ ] **[FE]** Manejo de 404 con `notFound()` de Next. _(US-03)_

---

#### US-04 — Cancelar una solicitud

> Como **Operador Logístico**, quiero **cancelar una solicitud que ya no es viable**, para **mantener el dashboard ordenado y trazable**.

**Épica:** E01 · **Prioridad:** Should · **Estimación:** 3 pts

**Criterios de Aceptación:**

**Escenario 1: Cancelación de solicitud pendiente**
```gherkin
Dado que existe una solicitud en estado "pendiente"
Cuando el operador hace click en "Cancelar solicitud"
Y confirma la acción en el diálogo modal
Entonces la solicitud pasa a estado "cancelada"
Y se registra `cancelada_at` y `motivo_cancelacion`
Y se muestra en el listado con un chip gris "cancelada"
```

**Escenario 2: Cancelación de solicitud completada (no permitida)**
```gherkin
Dado que existe una solicitud en estado "completada"
Cuando el operador intenta cancelarla
Entonces el sistema rechaza la acción con HTTP 422
Y muestra mensaje "No se puede cancelar una solicitud completada"
```

**Tareas técnicas:**

- [ ] **[DB]** Agregar columnas `cancelada_at`, `motivo_cancelacion` a `solicitudes`. _(US-04)_
- [ ] **[API]** `POST /api/transport-requests/:id/cancel` con validación de estados permitidos. _(US-04)_
- [ ] **[FE]** Diálogo de confirmación con textarea opcional para motivo. _(US-04)_

---

#### US-05 — Visualizar estado de cada solicitud

> Como **Operador Logístico**, quiero **distinguir visualmente el estado de cada solicitud (pendiente/asignada/en curso/completada/cancelada)**, para **saber dónde está cada trabajo de un vistazo**.

**Épica:** E01 · **Prioridad:** Must · **Estimación:** 2 pts

**Criterios de Aceptación:**

**Escenario 1: Chips de estado**
```gherkin
Dado que existen solicitudes en cada uno de los 5 estados
Cuando el operador mira el dashboard
Entonces cada tarjeta muestra un chip de color distintivo:
  | estado     | color   |
  | pendiente  | amarillo|
  | asignada   | azul    |
  | en_curso   | violeta |
  | completada | verde   |
  | cancelada  | gris    |
Y el chip tiene texto y no solo color (accesibilidad)
```

**Tareas técnicas:**

- [ ] **[DB]** Enum `solicitud_estado` con los 5 valores. _(US-05)_
- [ ] **[FE]** Componente `<StatusChip status={...} />` con mapa color/label. _(US-05)_
- [ ] **[FE]** Tokens de color en Tailwind config. _(US-05)_

---

### Épica E02 — Administración de Flota Vehicular

---

#### US-06 — Registrar un camión nuevo

> Como **Operador Logístico**, quiero **registrar un nuevo camión con patente, capacidad máxima y coeficiente de consumo**, para **incorporarlo al inventario de flota disponible para asignaciones**.

**Épica:** E02 · **Prioridad:** Must · **Estimación:** 5 pts

**Criterios de Aceptación:**

**Escenario 1: Registro exitoso**
```gherkin
Dado que el operador está en la pantalla de Flota
Cuando hace click en "Nuevo camión"
Y completa: patente "ABC1234", capacidad 50, consumo 0.45 L/Km
Y confirma con "Registrar"
Entonces el camión se persiste en estado "activo"
Y la respuesta es HTTP 201 con el objeto creado
Y aparece en el listado de flota
```

**Escenario 2: Patente duplicada (invariante INV-02)**
```gherkin
Dado que ya existe un camión con patente "ABC1234"
Cuando el operador intenta registrar otro camión con la misma patente
Entonces el sistema responde HTTP 409 Conflict
Y el formulario muestra error "Ya existe un camión con esa patente"
```

**Escenario 3: Normalización de patente**
```gherkin
Dado que el operador ingresa la patente "abc 1234" (con minúsculas y espacios)
Cuando guarda el camión
Entonces la patente se persiste como "ABC1234"
Y posteriores intentos con "ABC1234", "abc1234" o "  ABC 1234  " son detectados como duplicados
```

**Escenario 4: Validación de consumo no positivo**
```gherkin
Dado que el operador ingresa consumo "0" o "-0.1"
Cuando intenta guardar
Entonces el formulario muestra error "El consumo debe ser mayor a 0"
Y el botón guardar queda deshabilitado
```

**Tareas técnicas:**

- [ ] **[DB]** Tabla `camiones` con campos: `id`, `patente`, `patente_normalizada` (generada), `capacidad_max`, `consumo_l_km`, `estado`, `created_at`. _(US-06)_
- [ ] **[DB]** `UNIQUE INDEX` sobre `patente_normalizada`. _(US-06)_
- [ ] **[DB]** `CHECK` constraints: `capacidad_max >= 1`, `consumo_l_km > 0`. _(US-06)_
- [ ] **[DB]** Trigger `prevent_truck_immutable_fields_update` que rechaza updates a `patente`, `capacidad_max`, `consumo_l_km`. _(US-06)_
- [ ] **[API]** `POST /api/trucks` con Zod + manejo de conflicto (409). _(US-06)_
- [ ] **[FE]** Página `app/(dashboard)/fleet/new/page.tsx`. _(US-06)_
- [ ] **[FE]** Helper `normalizePatente()` para feedback en tiempo real. _(US-06)_
- [ ] **[QA]** Test: intento de POST con patente duplicada normalizada → 409. _(US-06)_

---

#### US-07 — Listar camiones de la flota

> Como **Operador Logístico**, quiero **ver el listado completo de mi flota con sus capacidades y estado**, para **conocer qué recursos tengo disponibles**.

**Épica:** E02 · **Prioridad:** Must · **Estimación:** 3 pts

**Criterios de Aceptación:**

**Escenario 1: Listado con activos e inactivos**
```gherkin
Dado que existen 3 camiones activos y 1 inactivo
Cuando el operador entra a la pantalla de Flota
Entonces ve los 4 camiones en una tabla
Y los activos aparecen primero
Y el camión inactivo tiene visualmente menor énfasis (gris atenuado)
Y se muestran columnas: patente, capacidad, consumo, estado, acciones
```

**Escenario 2: Filtro por estado**
```gherkin
Dado que existen camiones activos e inactivos
Cuando el operador activa el filtro "solo activos"
Entonces se ocultan los camiones inactivos
Y el contador refleja la cantidad filtrada
```

**Tareas técnicas:**

- [ ] **[API]** `GET /api/trucks?estado=` con paginación. _(US-07)_
- [ ] **[FE]** Página `app/(dashboard)/fleet/page.tsx`. _(US-07)_
- [ ] **[FE]** Componente `<TruckTable />` con ordenamiento por columna. _(US-07)_

---

#### US-08 — Dar de baja (inactivar) un camión

> Como **Operador Logístico**, quiero **marcar un camión como inactivo (sin eliminarlo del sistema)**, para **preservar el histórico de asignaciones pasadas mientras lo saco de la operación**.

**Épica:** E02 · **Prioridad:** Must · **Estimación:** 3 pts

**Criterios de Aceptación:**

**Escenario 1: Baja exitosa**
```gherkin
Dado que existe un camión activo sin asignaciones en curso
Cuando el operador hace click en "Dar de baja"
Y confirma en el diálogo
Entonces el camión pasa a estado "inactivo"
Y deja de aparecer en los selectores de asignación
Y sigue visible en el listado de flota con marca visual
Y sigue siendo referenciable en asignaciones históricas
```

**Escenario 2: Camión con asignaciones activas (regla de negocio)**
```gherkin
Dado que existe un camión con una asignación en estado "activa"
Cuando el operador intenta darlo de baja
Entonces el sistema responde HTTP 422
Y muestra error "El camión tiene una asignación activa. Libérela antes de darlo de baja."
```

**Escenario 3: Reactivación**
```gherkin
Dado que existe un camión inactivo
Cuando el operador hace click en "Reactivar"
Entonces el camión vuelve al estado "activo"
Y reaparece en los selectores de asignación
```

**Tareas técnicas:**

- [ ] **[API]** `PATCH /api/trucks/:id` que solo permite cambiar `estado`. _(US-08)_
- [ ] **[API]** Validación: rechazar baja si hay asignaciones activas. _(US-08)_
- [ ] **[FE]** Diálogo de confirmación con explicación de impacto. _(US-08)_

---

#### US-09 — Ver detalle e histórico de un camión

> Como **Operador Logístico**, quiero **abrir un camión y ver su histórico de asignaciones**, para **evaluar su uso y rendimiento**.

**Épica:** E02 · **Prioridad:** Could · **Estimación:** 5 pts

**Criterios de Aceptación:**

**Escenario 1: Detalle con histórico**
```gherkin
Dado que existe un camión con 5 asignaciones pasadas
Cuando el operador abre su detalle
Entonces ve sus datos críticos (patente/capacidad/consumo) marcados como "inmutables"
Y ve la tabla de asignaciones con: solicitud, fecha, distancia, costo, estado
Y ve métricas agregadas: total Km recorridos, total litros, costo combustible acumulado
```

**Escenario 2: Camión sin histórico**
```gherkin
Dado que el camión recién registrado no tiene asignaciones
Cuando se abre su detalle
Entonces ve un estado vacío "Este camión aún no tiene asignaciones"
```

**Tareas técnicas:**

- [ ] **[API]** `GET /api/trucks/:id` con campo agregado `historico_asignaciones`. _(US-09)_
- [ ] **[API]** Query agregada: total Km, total litros, total costo. _(US-09)_
- [ ] **[FE]** Página `app/(dashboard)/fleet/[id]/page.tsx`. _(US-09)_
- [ ] **[FE]** Iconografía de "candado" sobre campos inmutables con tooltip explicativo. _(US-09)_

---

### Épica E03 — Geolocalización, Mapas y Rutas

---

#### US-10 — Visualizar la ruta de una solicitud en el mapa

> Como **Operador Logístico**, quiero **ver el trayecto trazado en un mapa interactivo entre origen y destino**, para **entender visualmente el viaje**.

**Épica:** E03 · **Prioridad:** Must · **Estimación:** 8 pts

**Criterios de Aceptación:**

**Escenario 1: Mapa con ruta trazada**
```gherkin
Dado que existe una solicitud con origen y destino válidos
Cuando el operador abre su detalle
Entonces se carga un mapa centrado en los dos puntos
Y aparecen dos pines: uno verde (origen) y uno rojo (destino)
Y se traza una polilínea entre ambos siguiendo rutas reales
Y el zoom se ajusta para mostrar toda la ruta
```

**Escenario 2: Interacción con el mapa**
```gherkin
Dado que se muestra una ruta en el mapa
Cuando el operador hace click en un pin
Entonces aparece un popup con el label legible del punto (ej. "Tacuarembó, UY")
```

**Escenario 3: Falla del servicio de tiles (edge case)**
```gherkin
Dado que el servicio de tiles OSM no responde
Cuando se intenta cargar el mapa
Entonces se muestra un placeholder con mensaje "Mapa no disponible — reintentar"
Y los datos textuales de la ruta (origen, destino, distancia) siguen visibles
```

**Tareas técnicas:**

- [ ] **[FE]** Wrapper `<LeafletMap />` que respete SSR de Next (dynamic import sin SSR). _(US-10)_
- [ ] **[FE]** Hook `useRoute(origenLat, origenLon, destinoLat, destinoLon)` que consulta OSRM. _(US-10)_
- [ ] **[FE]** Manejo de error con fallback informativo. _(US-10)_
- [ ] **[FE]** Pines diferenciados por color + popups con label. _(US-10)_
- [ ] **[DOCS]** Documentar el endpoint OSRM y cómo cambiarlo. _(US-10)_

---

#### US-11 — Seleccionar origen y destino al crear una solicitud

> Como **Operador Logístico**, quiero **elegir origen y destino mediante búsqueda por nombre o pin en el mapa**, para **registrar coordenadas correctas sin tipear lat/lon a mano**.

**Épica:** E03 · **Prioridad:** Must · **Estimación:** 8 pts

**Criterios de Aceptación:**

**Escenario 1: Búsqueda por nombre con geocoding**
```gherkin
Dado que el operador está creando una solicitud
Cuando escribe "Tacuarembó" en el input de origen
Entonces aparece un dropdown con resultados de geocoding (Nominatim)
Y al seleccionar uno, el pin se ubica en esas coordenadas
Y el label "Tacuarembó, Uruguay" se persiste junto con lat/lon
```

**Escenario 2: Selección por click en el mapa**
```gherkin
Dado que el operador hace click directamente sobre el mapa para definir el destino
Cuando suelta el pin
Entonces se hace reverse-geocoding para obtener un label legible
Y el formulario muestra el label en el input
Y se persisten lat/lon precisos del click
```

**Escenario 3: Búsqueda sin resultados (edge case)**
```gherkin
Dado que el operador escribe "asdfqwer" (sin resultados)
Cuando espera el dropdown
Entonces se muestra "Sin resultados — intentá con otro término o seleccioná en el mapa"
```

**Tareas técnicas:**

- [ ] **[FE]** Componente `<GeoInput />` con debounce + autocomplete vía Nominatim. _(US-11)_
- [ ] **[FE]** Click handler sobre `<LeafletMap />` con reverse-geocoding. _(US-11)_
- [ ] **[FE]** Validación: lat ∈ [-90, 90], lon ∈ [-180, 180]. _(US-11)_

---

#### US-12 — Mostrar distancia y tiempo estimado del trayecto

> Como **Operador Logístico**, quiero **ver la distancia y duración estimada de un trayecto**, para **dimensionar el viaje antes de asignar un camión**.

**Épica:** E03 · **Prioridad:** Must · **Estimación:** 3 pts

**Criterios de Aceptación:**

**Escenario 1: Métricas visibles en el detalle**
```gherkin
Dado que una solicitud tiene ruta calculada
Cuando el operador ve su detalle
Entonces aparece la métrica "Distancia: 520 km"
Y la métrica "Tiempo estimado: 6 h 12 min"
Y ambas métricas están bien diferenciadas visualmente del resto del contenido
```

**Escenario 2: Distancia no disponible**
```gherkin
Dado que la solicitud tiene origen y destino pero distancia_km es NULL
Cuando se carga el detalle
Entonces aparece "Distancia: pendiente de cálculo"
Y un botón "Recalcular ruta"
```

**Tareas técnicas:**

- [ ] **[API]** `POST /api/transport-requests/:id/recalculate-route` que persiste `distancia_km` y `tiempo_estimado_min`. _(US-12)_
- [ ] **[DB]** Columnas `distancia_km` (NUMERIC) y `tiempo_estimado_min` (INT) en `solicitudes`. _(US-12)_
- [ ] **[FE]** Componente `<RouteMetrics />` con formato humano de distancia/tiempo. _(US-12)_

---

### Épica E04 — Asignación y Cálculo Logístico-Financiero

---

#### US-13 — Asignar un camión a una solicitud

> Como **Operador Logístico**, quiero **seleccionar un camión de mi flota y vincularlo a una solicitud pendiente**, para **comprometer el recurso para ese viaje**.

**Épica:** E04 · **Prioridad:** Must · **Estimación:** 8 pts
**Depende de:** US-06, US-07, US-14.

**Criterios de Aceptación:**

**Escenario 1: Asignación exitosa con costo calculado**
```gherkin
Dado que existe una solicitud "pendiente" con distancia 520 km y 40 cabezas
Y existe un camión activo con capacidad 60 y consumo 0.45 L/Km
Y el precio del combustible es 75 PYG/L
Cuando el operador selecciona ese camión y confirma asignación
Entonces se crea la asignación con costo_combustible = 520 × 0.45 × 75 = 17550 PYG
Y la asignación persiste: precio_litro_aplicado=75, distancia_km=520, consumo_aplicado=0.45
Y la solicitud pasa a estado "asignada"
Y la respuesta es HTTP 201
```

**Escenario 2: Solo se listan camiones activos**
```gherkin
Dado que hay 3 camiones activos y 2 inactivos
Cuando el operador abre el selector de camiones para asignar
Entonces sólo se listan los 3 activos
```

**Escenario 3: Camión ya tiene asignación activa en otra solicitud**
```gherkin
Dado que un camión tiene una asignación activa en la solicitud A
Cuando se intenta asignarlo simultáneamente a la solicitud B
Entonces el sistema responde HTTP 409 Conflict
Y muestra "Este camión ya está asignado a la solicitud A"
```

**Escenario 4: Solicitud ya asignada (invariante INV-03)**
```gherkin
Dado que la solicitud ya tiene una asignación activa
Cuando se intenta crear otra asignación para la misma solicitud
Entonces el sistema responde HTTP 409
Y muestra "Esta solicitud ya tiene un camión asignado. Liberalo antes de reasignar."
```

**Tareas técnicas:**

- [ ] **[DB]** Tabla `asignaciones` con campos: `id`, `solicitud_id`, `camion_id`, `precio_litro_aplicado`, `consumo_aplicado`, `distancia_km_aplicada`, `cabezas_aplicadas`, `costo_combustible`, `estado` (`activa|liberada|completada`), `created_at`, `closed_at`. _(US-13)_
- [ ] **[DB]** `UNIQUE INDEX` parcial: `(solicitud_id) WHERE estado='activa'` y `(camion_id) WHERE estado='activa'`. _(US-13)_
- [ ] **[API]** `POST /api/assignments` con cálculo de costo en función pura `calcularCostoCombustible()`. _(US-13)_
- [ ] **[API]** Transición de estado: `solicitudes.estado = 'asignada'` en la misma transacción. _(US-13)_
- [ ] **[FE]** Modal o página `app/(dashboard)/requests/[id]/assign/page.tsx`. _(US-13)_
- [ ] **[FE]** Selector de camiones con previsualización del costo calculado en vivo. _(US-13)_
- [ ] **[QA]** Test: doble asignación concurrente → solo una sobrevive (409). _(US-13)_

---

#### US-14 — Calcular el costo de combustible dinámicamente al seleccionar un camión

> Como **Operador Logístico**, quiero **ver el costo de combustible calculado en tiempo real al previsualizar un camión candidato**, para **decidir cuál asignar sin tener que confirmar para verlo**.

**Épica:** E04 · **Prioridad:** Must · **Estimación:** 5 pts

**Criterios de Aceptación:**

**Escenario 1: Cambio dinámico al seleccionar camión**
```gherkin
Dado que el operador está en la pantalla de asignación
Y la distancia es 520 km, precio del combustible es 75 PYG/L
Cuando selecciona el camión con consumo 0.45 L/Km
Entonces se muestra "Costo estimado: 17 550 PYG"
Y cuando cambia al camión con consumo 0.55 L/Km
Entonces el costo se actualiza a 21 450 PYG sin recargar la página
```

**Escenario 2: Distancia no disponible**
```gherkin
Dado que la solicitud no tiene distancia calculada (NULL)
Cuando el operador abre la pantalla de asignación
Entonces el costo se muestra como "—"
Y aparece un warning "Distancia no calculada. Recalcular ruta para ver costo estimado."
```

**Tareas técnicas:**

- [ ] **[lib/domain]** Función pura `calcularCostoCombustible({ distanciaKm, consumoLKm, precioLitro })` con guards de inputs. _(US-14)_
- [ ] **[lib/domain]** Tests unitarios con casos: nominal, inputs inválidos, redondeo a 2 decimales. _(US-14)_
- [ ] **[FE]** Hook `useFuelCostPreview()` que recibe `camionId` y devuelve el costo en vivo. _(US-14)_
- [ ] **[FE]** Formato de moneda configurable (default PYG). _(US-14)_

---

#### US-15 — Alertar sobrecapacidad y sugerir alternativas

> Como **Operador Logístico**, quiero **ser alertado inmediatamente si las cabezas de la solicitud exceden la capacidad del camión, con sugerencias concretas de acción**, para **evitar errores operativos**.

**Épica:** E04 · **Prioridad:** Must · **Estimación:** 5 pts
**Realiza BR-01.**

**Criterios de Aceptación:**

**Escenario 1: Sobrecapacidad detectada con sugerencia**
```gherkin
Dado que la solicitud tiene 80 cabezas
Y el camión seleccionado tiene capacidad 50
Cuando el operador previsualiza la asignación
Entonces aparece un banner de alerta de color naranja
Y dice "Sobrecapacidad: 80 cabezas > capacidad 50"
Y sugiere: "Opción A — dividir en 2 viajes (capacidad 50 + 30)" y "Opción B — elegir otro camión con mayor capacidad"
Y lista los camiones activos con capacidad ≥ 80 como sugeridos
```

**Escenario 2: Asignación con sobrecapacidad permitida con confirmación explícita**
```gherkin
Dado que existe sobrecapacidad
Cuando el operador igualmente confirma la asignación
Entonces el sistema requiere confirmación adicional ("Confirmo que tomo el riesgo de sobrecapacidad")
Y la asignación se persiste con flag `con_sobrecapacidad = true`
Y queda visible en el dashboard con un indicador rojo de advertencia
```

**Escenario 3: Sin sobrecapacidad (camino feliz)**
```gherkin
Dado que la solicitud tiene 30 cabezas y el camión tiene capacidad 50
Cuando se previsualiza la asignación
Entonces no aparece ningún banner de alerta
Y el botón "Confirmar asignación" está habilitado directamente
```

**Tareas técnicas:**

- [ ] **[lib/domain]** Función pura `evaluarSobrecapacidad(cabezas, capacidad)` que retorna `{ excedida, viajesNecesarios }`. _(US-15)_
- [ ] **[lib/domain]** Función `sugerirCamionesAlternativos(cabezas, camiones[])` que filtra y ordena por mejor ajuste. _(US-15)_
- [ ] **[FE]** Componente `<CapacityAlert />` con estados visuales escalonados (none/warning/error). _(US-15)_
- [ ] **[FE]** Diálogo de doble confirmación cuando se persiste con sobrecapacidad. _(US-15)_
- [ ] **[DB]** Columna `con_sobrecapacidad BOOLEAN DEFAULT FALSE` en `asignaciones`. _(US-15)_
- [ ] **[QA]** Test de cada escenario (sin/con sobrecapacidad/borde exacto). _(US-15)_

---

#### US-16 — Liberar o cambiar la asignación de una solicitud

> Como **Operador Logístico**, quiero **liberar la asignación actual o reemplazarla por otro camión**, para **corregir errores o adaptarme a cambios operativos**.

**Épica:** E04 · **Prioridad:** Should · **Estimación:** 5 pts

**Criterios de Aceptación:**

**Escenario 1: Liberar asignación activa**
```gherkin
Dado que una solicitud tiene una asignación en estado "activa"
Cuando el operador hace click en "Liberar asignación"
Y confirma
Entonces la asignación pasa a estado "liberada" con `closed_at` registrado
Y la solicitud vuelve a estado "pendiente"
Y el camión queda disponible para nuevas asignaciones
```

**Escenario 2: Reemplazo directo**
```gherkin
Dado que una solicitud tiene una asignación activa con camión A
Cuando el operador inicia "Cambiar camión" y selecciona camión B
Entonces en una sola transacción:
  - la asignación de A pasa a "liberada"
  - se crea una nueva asignación con B con costo recalculado y snapshot actual de precio_litro
Y la solicitud se mantiene en estado "asignada"
```

**Escenario 3: No se puede liberar una asignación ya completada**
```gherkin
Dado que la asignación está en estado "completada"
Cuando se intenta liberarla
Entonces el sistema responde HTTP 422 con mensaje claro
```

**Tareas técnicas:**

- [ ] **[API]** `POST /api/assignments/:id/release`. _(US-16)_
- [ ] **[API]** `POST /api/assignments/:id/replace` con body `{ camion_id }` — implementado como transacción. _(US-16)_
- [ ] **[FE]** Botones "Liberar" y "Cambiar camión" en el detalle de solicitud asignada. _(US-16)_

---

### Épica E05 — Parametrización y Configuración

---

#### US-17 — Configurar el precio del combustible por litro

> Como **Operador Logístico**, quiero **actualizar el precio actual del combustible desde una pantalla de configuración**, para **que los nuevos cálculos reflejen el valor real del mercado**.

**Épica:** E05 · **Prioridad:** Must · **Estimación:** 3 pts

**Criterios de Aceptación:**

**Escenario 1: Actualización exitosa**
```gherkin
Dado que el precio actual del combustible es 75 PYG/L
Cuando el operador ingresa 82.50 y guarda
Entonces el precio actual pasa a 82.50
Y se registra una entrada en `parametros_historial` con valor anterior y nuevo
Y todas las nuevas asignaciones usan el nuevo precio
```

**Escenario 2: Precio no positivo (invariante INV-05)**
```gherkin
Dado que el operador ingresa "0" o "-1"
Cuando intenta guardar
Entonces el formulario muestra error "El precio debe ser mayor a 0"
Y la API rechaza con HTTP 400 si se intenta forzar
```

**Escenario 3: Asignaciones previas no se afectan (invariante INV-04)**
```gherkin
Dado que existe una asignación creada con precio_litro_aplicado = 75
Cuando el operador cambia el precio actual a 82.50
Entonces la asignación anterior sigue mostrando costo_combustible calculado con 75
```

**Tareas técnicas:**

- [ ] **[DB]** Tabla `parametros` con `clave TEXT PRIMARY KEY`, `valor JSONB`, `actualizado_at TIMESTAMPTZ`. _(US-17)_
- [ ] **[DB]** Tabla `parametros_historial` con `clave`, `valor_anterior`, `valor_nuevo`, `changed_at`. _(US-17)_
- [ ] **[API]** `GET /api/settings/fuel-price` y `PUT /api/settings/fuel-price`. _(US-17)_
- [ ] **[FE]** Página `app/(dashboard)/settings/page.tsx`. _(US-17)_

---

#### US-18 — Auditar historial de cambios de parámetros

> Como **Operador Logístico**, quiero **ver el historial de cambios del precio del combustible**, para **trazar quién cambió qué y cuándo**.

**Épica:** E05 · **Prioridad:** Could · **Estimación:** 2 pts

**Criterios de Aceptación:**

**Escenario 1: Historial visible**
```gherkin
Dado que el precio fue modificado 3 veces
Cuando el operador entra a la pantalla de configuración
Entonces ve una tabla "Historial" con columnas: fecha, valor anterior, valor nuevo
Y los registros se ordenan del más reciente al más antiguo
```

**Tareas técnicas:**

- [ ] **[API]** `GET /api/settings/fuel-price/history`. _(US-18)_
- [ ] **[FE]** Tabla colapsable "Historial" en `app/(dashboard)/settings/page.tsx`. _(US-18)_

---

### Épica E07 — Autenticación y Control de Acceso

---

#### US-19 — Ingresar al sistema con credenciales

> Como **Operador / Admin**, quiero **autenticarme con email y contraseña**, para **acceder al panel y operar con mi rol asignado**.

**Épica:** E07 · **Prioridad:** Must · **Estimación:** 5 pts

**Criterios de Aceptación:**

**Escenario 1: Login exitoso**
```gherkin
Dado que existe el usuario "admin@bovitrans.local" con contraseña "BoviTrans2026!"
Cuando el usuario ingresa esas credenciales y confirma
Entonces el sistema responde HTTP 200 con los datos públicos del usuario
Y setea la cookie httpOnly "bvt_session" con un JWT firmado HS256
Y la cookie tiene SameSite=Lax y secure=true en producción
Y el usuario es redirigido al panel principal
```

**Escenario 2: Credenciales inválidas**
```gherkin
Dado que el usuario ingresa una contraseña incorrecta
Cuando intenta iniciar sesión
Entonces el sistema responde HTTP 401
Y devuelve el mensaje "Credenciales inválidas." (igual que si el usuario no existiera, para evitar user enumeration)
```

**Escenario 3: Acceso sin sesión**
```gherkin
Dado que no hay cookie de sesión válida
Cuando se intenta acceder a "/" o a "/api/trucks"
Entonces para rutas UI se redirige a /login?next=...
Y para rutas API la respuesta es HTTP 401 con `{ "error": { "code": "UNAUTHORIZED" } }`
```

**Tareas técnicas:**

- [ ] **[DB]** Tabla `users` con `email`, `email_normalizado` (GENERATED), `password_hash`, `nombre`, `rol` (enum operador|admin). _(US-19)_
- [ ] **[DB]** Seed admin + operador con hashes bcrypt cost 12. _(US-19)_
- [ ] **[API]** `POST /api/auth/login` con Zod + bcrypt + emisión JWT. _(US-19)_
- [ ] **[API]** `middleware.ts` que protege rutas y redirige a /login. _(US-19)_
- [ ] **[FE]** Página `/login` con form y manejo de `?next=...`. _(US-19)_
- [ ] **[FE]** Whitelist anti open-redirect en `?next=` (solo paths relativos). _(US-19)_

---

#### US-20 — Cerrar sesión

> Como **usuario autenticado**, quiero **cerrar sesión desde el sidebar**, para **garantizar que nadie acceda a la plataforma con mi sesión cuando dejo el equipo**.

**Épica:** E07 · **Prioridad:** Must · **Estimación:** 2 pts

**Criterios de Aceptación:**

**Escenario 1: Logout limpia la cookie**
```gherkin
Dado que el usuario tiene sesión activa
Cuando hace click en "Cerrar sesión"
Entonces el sistema responde HTTP 204
Y la cookie "bvt_session" se invalida
Y el usuario es redirigido a /login
```

**Tareas técnicas:**

- [ ] **[API]** `POST /api/auth/logout` que borra la cookie. _(US-20)_
- [ ] **[FE]** Botón "Cerrar sesión" en el bloque de usuario del sidebar. _(US-20)_

---

#### US-21 — Restringir modificación de parámetros a admin (RBAC)

> Como **Administrador del Sistema**, quiero **que sólo los usuarios con rol admin puedan modificar el precio del combustible**, para **evitar que cualquier operador altere parámetros financieros críticos**.

**Épica:** E07 · **Prioridad:** Must · **Estimación:** 3 pts

**Criterios de Aceptación:**

**Escenario 1: Admin actualiza precio**
```gherkin
Dado que el usuario autenticado tiene rol "admin"
Cuando hace PUT a /api/settings/fuel-price con un nuevo valor
Entonces el sistema responde HTTP 200 y persiste el cambio
Y el historial registra la modificación
```

**Escenario 2: Operador intenta actualizar precio**
```gherkin
Dado que el usuario autenticado tiene rol "operador"
Cuando hace PUT a /api/settings/fuel-price
Entonces el sistema responde HTTP 403 (FORBIDDEN)
Y devuelve el mensaje "Esta acción requiere rol 'admin'. Tu rol actual: 'operador'."
```

**Escenario 3: UI esconde controles según rol**
```gherkin
Dado que el usuario operador entra a /settings
Cuando se renderiza la página
Entonces ve el precio actual y el historial
Pero NO ve el form de edición
Y aparece un badge "solo lectura"
Y el link "Configuración" del sidebar tampoco se renderiza para operadores
```

**Tareas técnicas:**

- [ ] **[API]** Helper `requireRole(rol)` que lanza `forbidden()` si el rol no coincide. _(US-21)_
- [ ] **[API]** Aplicar `requireRole('admin')` en `PUT /api/settings/fuel-price`. _(US-21)_
- [ ] **[FE]** Settings page condicional según `user.rol`. _(US-21)_
- [ ] **[FE]** Sidebar oculta link "Configuración" para no-admin. _(US-21)_

---

### Épica E06 — Plataforma e Infraestructura (técnica)

Esta épica no tiene historias de usuario tradicionales. Se descompone directamente en **tareas técnicas habilitantes** (Sprint 0). Estas tareas son prerrequisitos cross-cutting de todas las US funcionales.

**Tareas técnicas:**

- [ ] **[DevOps]** `Dockerfile` multi-stage para Next.js (deps → build → runtime). _(E06)_
- [ ] **[DevOps]** `docker-compose.yml` con servicios `app` y `db`, volumen nombrado `bovitrans-pgdata`, healthchecks. _(E06)_
- [ ] **[DevOps]** `.env.example` con todas las variables necesarias (`DATABASE_URL`, `NEXT_PUBLIC_*`, `FUEL_PRICE_DEFAULT`, `OSRM_BASE_URL`). _(E06)_
- [ ] **[DB]** `db/init.sql` idempotente: schema completo + datos semilla (3 camiones de ejemplo, 5 solicitudes, 1 parámetro de precio inicial). _(E06)_
- [ ] **[DB]** Convención de migraciones futuras en `db/migrations/NNN_<descripcion>.sql`. _(E06)_
- [ ] **[API]** Wrapper `lib/db/client.ts` con pool `pg` reutilizable y manejo de transacciones. _(E06)_
- [ ] **[API]** Middleware de manejo de errores: 400/404/409/422/500 con cuerpo `{ error: { code, message, details } }`. _(E06)_
- [ ] **[API]** Logger estructurado JSON (pino) con request-id. _(E06)_
- [ ] **[FE]** Layout base con sidebar de navegación y header. _(E06)_
- [ ] **[FE]** Sistema de toasts globales y diálogos modales. _(E06)_
- [ ] **[FE]** Tema con Tailwind tokens + paleta de marca. _(E06)_
- [ ] **[QA]** Test de smoke: `docker-compose up --build` arranca y `/healthz` responde 200. _(E06)_
- [ ] **[DOCS]** `DOCUMENTACION.md` (Fase 4). _(E06)_
- [ ] **[DOCS]** README con instrucciones de arranque. _(E06)_

---

## 7. Matriz de dependencias entre US

```
US-01 ──┐
US-05 ──┴── (independientes, sólo dependen de E06)

US-02 ── depende de ── US-11 (selector geográfico)
US-03 ── depende de ── US-10 (mapa de ruta)
US-12 ── depende de ── US-10
US-13 ── depende de ── US-06, US-07, US-14
US-14 ── depende de ── US-17 (precio configurable)
US-15 ── depende de ── US-13
US-16 ── depende de ── US-13
US-18 ── depende de ── US-17
```

**Camino crítico:** E06 (infra) → US-06 (registrar camión) → US-17 (precio) → US-14 (cálculo) → US-13 (asignar) → US-15 (alerta sobrecapacidad).

---

## 8. Roadmap sugerido por sprint

> Sprints de 2 días corridos cada uno, alineados al plazo de 8 días de la prueba.

| Sprint | Días | Foco | US incluidas | Entregable visible |
|---|---|---|---|---|
| **Sprint 0** | Día 1 | Infraestructura, modelo de datos, scaffolding | E06 completo | `docker-compose up --build` levanta app + db con seed |
| **Sprint 1** | Días 2-3 | Flota y configuración (fundacionales para el cálculo) | US-06, US-07, US-08, US-17 | CRUD de camiones funcional + setting de precio editable |
| **Sprint 2** | Días 4-5 | Solicitudes y mapas | US-01, US-02, US-03, US-05, US-10, US-11, US-12 | Dashboard con solicitudes + mapas operativos |
| **Sprint 3** | Días 6-7 | Asignación y reglas de negocio core | US-13, US-14, US-15, US-16 | Asignación completa con cálculo dinámico y alertas |
| **Sprint 4** | Día 8 | Polish, documentación, edge cases | US-04, US-09, US-18 + DOCUMENTACION.md + PR | Entrega final |

**Riesgos identificados:**

- _Integración OSRM_: si el endpoint público es inestable, mitigar con cacheo en DB de la primera respuesta exitosa de routing por solicitud.
- _Leaflet SSR_: requiere `dynamic import` con `ssr: false`. Documentado en CLAUDE.md.
- _Concurrencia en asignación_: cubierto con `UNIQUE INDEX` parcial — pero requiere test explícito.

---

## 9. Trace de prompts utilizados con Claude

Esta sección documenta la conversación iterativa con Claude para llegar al backlog actual. Refleja decisiones de diseño y refinamientos.

> Skill activado: [`bovitrans-analyst`](.claude/skills.json) (cargado vía `.claude/skills.json` y `CLAUDE.md`).

---

### Prompt 1 — Establecer el contexto y la persona

```
Vas a actuar como Analista de Negocios + Arquitecto de Software, usando el skill
"bovitrans-analyst" definido en .claude/skills.json. Confirmá que entendés:
(a) el dominio (transporte terrestre de ganado),
(b) los actores,
(c) los entregables requeridos (épicas, US, Gherkin, tasks),
(d) las invariantes que deben respetarse.
Antes de generar nada, listame en bullets las invariantes y reglas de negocio
que vas a respetar durante todo el discovery.
```

**Por qué este prompt:** Antes de generar artefactos, fuerzo a Claude a explicitar las invariantes. Esto convierte las reglas del dominio en restricciones activas durante el resto de la conversación y reduce inconsistencias entre US.

**Output esperado:** Lista numerada de invariantes (INV-01..INV-06) y reglas de negocio (BR-01..BR-04) con su mecanismo de enforcement.

---

### Prompt 2 — Desglose en épicas verticales

```
A partir de la descripción del MVP BoviTrans (que ya tenés en contexto),
proponé las épicas del proyecto.
Reglas:
- Las épicas deben ser verticales (flujos de valor), no horizontales por capa técnica.
- Cada épica debe tener (1) objetivo de negocio, (2) KPI de éxito, (3) lista de US esperadas (todavía sin desarrollar).
- Identificá una épica técnica separada (infra) para no contaminar las funcionales.
- Después de listarlas, sugerime cuál es el camino crítico de implementación.
```

**Por qué este prompt:** Explicito el principio "épicas verticales por flujo de valor". Un error común es desglosar por capa (épica "backend", épica "frontend"), lo que rompe la entregabilidad incremental.

**Output esperado:** 6 épicas (E01..E06) con la épica técnica E06 separada.

---

### Prompt 3 — Generación de user stories de una épica

> Repetido para cada épica E01..E05.

```
Para la épica {E0X}, generá todas las historias de usuario necesarias para cubrir
su objetivo de negocio en un MVP.
Reglas:
- Formato "Como [rol], quiero [acción], para [beneficio]".
- Asigná prioridad MoSCoW y estimación Fibonacci (1,2,3,5,8,13).
- Marcá dependencias con otras US si las hay.
- Cada US debe respetar INVEST.
- NO escribas todavía los criterios de aceptación ni las tareas — solo el header de la US.
- Si detectás que una US es demasiado grande (>13 pts), partila.
```

**Por qué dos pasos (US → AC):** Separar el desglose en US de la redacción de criterios permite revisar primero la cobertura (¿están todas las acciones del actor?) antes de invertir en detalle de cada una. Es más barato detectar US faltantes en esta fase.

---

### Prompt 4 — Criterios de aceptación Gherkin por US

> Repetido para cada US.

```
Para la {US-XX}, generá los criterios de aceptación en Gherkin.
Requisitos:
- Mínimo 2 escenarios: uno feliz + uno de borde o error.
- Si la US toca una invariante del skill, debe haber un escenario que la valide explícitamente.
- Usá "Dado que / Y / Cuando / Entonces / Y" en español.
- Cada Entonces debe ser objetivamente verificable (sin "se ve bien", "es rápido").
- Mencioná códigos HTTP en los escenarios de API.
```

**Por qué este prompt:** El bullet "objetivamente verificable" es la regla que más alto mueve la calidad de los AC. Sin él, Claude tiende a producir Gherkin con criterios subjetivos.

---

### Prompt 5 — Tareas técnicas por US

> Repetido para cada US.

```
Para la {US-XX} con sus criterios de aceptación ya definidos, listá las tareas
técnicas concretas necesarias para implementarla.
Reglas:
- Cada tarea debe ser accionable por una sola persona en menos de 1 día.
- Etiquetá cada tarea por capa: [DB], [API], [FE], [DevOps], [QA], [DOCS].
- Usá checkboxes markdown.
- Incluí la referencia a la US al final (ej: "_(US-XX)_").
- Si una tarea es prerrequisito de varias US, marcala como tal y NO la dupliques
  en cada US (vive en E06).
```

**Por qué este prompt:** El límite "< 1 día por tarea" obliga a Claude a descomponer en lugar de listar tareas vagas tipo "implementar feature X".

---

### Prompt 6 — Sanity check cruzado contra invariantes

```
Revisá todas las US generadas y respondé:
1. ¿Cada invariante del skill está cubierta por al menos una US con un escenario Gherkin que la valide?
2. ¿Hay alguna US donde el Gherkin contradiga una invariante (ej. permita editar un campo inmutable)?
3. ¿Hay reglas de negocio mencionadas en la descripción del producto que no estén capturadas en ninguna US?
Listame los hallazgos con referencias específicas (US-XX, INV-YY).
```

**Por qué este prompt:** Es el quality gate explícito del skill. Forzar una autorrevisión antes de cerrar el discovery atrapa contradicciones que un humano no ve en lectura lineal.

**Hallazgos del sanity check (resumen):**

- INV-01 → cubierta por US-06 (escenario 3 normalización), US-08 (PATCH solo estado), US-09 (UI con candados).
- INV-02 → cubierta por US-06 (escenario 2 duplicada).
- INV-03 → cubierta por US-13 (escenario 4).
- INV-04 → cubierta por US-17 (escenario 3).
- INV-05 → cubierta por US-02 (escenario 2), US-06 (escenario 4), US-17 (escenario 2).
- INV-06 → cubierta por US-13 (escenario 2), US-08 (escenario 1).
- BR-01 → cubierta por US-15 completa.
- BR-02 → cubierta por US-17, US-18.
- BR-03 → mencionada en US-02 (escenario 4 fallback) y US-10 (escenario 3).
- BR-04 → cubierta por US-14 (función pura testeada).

---

### Prompt 7 — Roadmap y secuenciación

```
Con todas las US listas, dame:
- La matriz de dependencias entre US.
- Un roadmap de 4-5 sprints de 2 días cada uno (alineado al plazo de 8 días),
  priorizando el camino crítico.
- Riesgos identificados con su mitigación propuesta.
- Qué dejarías afuera si tuvieras que recortar 1 día.
```

**Por qué este prompt:** Cerrar el discovery con un plan ejecutable y con explicitación de riesgos demuestra criterio de PO/arquitecto. La pregunta "qué recortarías" es deliberada — fuerza a priorizar.

---

### Prompt 8 — Cierre y exportación

```
Generá el archivo BACKLOG.md final reuniendo:
1. Visión y alcance
2. Actores y roles
3. Glosario
4. Invariantes y reglas de negocio
5. Épicas completas
6. Todas las US con AC Gherkin y tareas
7. Matriz de dependencias
8. Roadmap
9. Esta misma conversación de prompts como sección final (trace de prompts).

Respetá el outputFormats definido en .claude/skills.json (templates de épica,
US, AC, tarea técnica).
```

---

### Reflexión sobre la estrategia de prompting

Tres principios que estructuraron toda la conversación:

1. **Cargar el contexto una sola vez con un skill formal.** En lugar de repetir reglas en cada prompt, todo el dominio (invariantes, glosario, formatos, anti-patterns) vive en `.claude/skills.json`. Cada prompt activa partes específicas del skill por referencia. Esto bajó dramáticamente el ruido en los prompts y aumentó la consistencia entre US.

2. **Desglose en capas, no en un solo shot.** Generar todo el backlog en un único prompt produce salidas superficiales. La secuencia épicas → US → AC → tareas → sanity check permite refinar en cada capa antes de comprometer la siguiente.

3. **Sanity check explícito antes de cerrar.** El Prompt 6 (auditoría contra invariantes) detecta huecos que la lectura lineal no encuentra. Es el equivalente a tests de cobertura, pero sobre el discovery.
