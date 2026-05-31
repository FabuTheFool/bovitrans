-- ============================================================================
-- BoviTrans — Esquema inicial + datos semilla
-- ============================================================================
-- Este archivo es cargado por el contenedor `db` en su primer arranque
-- (mount en /docker-entrypoint-initdb.d/). Es idempotente: usa IF NOT EXISTS
-- y ON CONFLICT donde corresponde, para que un re-run no rompa.
--
-- Decisiones de diseño documentadas inline. Para la versión narrada, ver
-- DOCUMENTACION.md (Fase 4).
-- ============================================================================

SET client_min_messages TO WARNING;
SET timezone TO 'UTC';

-- ─── Extensiones ───────────────────────────────────────────────────────────
-- citext: permitiría comparar emails/strings case-insensitive sin LOWER().
-- No la necesitamos en MVP: la normalización de patente es explícita
-- mediante una columna generada en uppercase.

-- ─── Tipos enum ────────────────────────────────────────────────────────────
-- Decisión: enums en DB en lugar de tablas de lookup, porque los valores son
-- estables (parte del dominio) y pocas. Si en el futuro evolucionan, se
-- migran a tablas con FK.

DO $$ BEGIN
    CREATE TYPE solicitud_estado AS ENUM (
        'pendiente', 'asignada', 'en_curso', 'completada', 'cancelada'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE camion_estado AS ENUM ('activo', 'inactivo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE asignacion_estado AS ENUM ('activa', 'liberada', 'completada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Función utilitaria: updated_at automático ─────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ============================================================================
-- TABLA: camiones
-- ============================================================================
-- Invariantes implicadas:
--   INV-01: patente, capacidad_max y consumo_l_km son inmutables post-insert.
--   INV-02: la patente es única globalmente, normalizada (uppercase, sin espacios).
--   INV-05: capacidad_max >= 1, consumo_l_km > 0.
--
-- patente_normalizada es una columna GENERADA: derivada determinísticamente
-- de patente. Evita que la app olvide normalizar antes de insertar.

CREATE TABLE IF NOT EXISTS camiones (
    id                  BIGSERIAL PRIMARY KEY,
    patente             TEXT NOT NULL,
    patente_normalizada TEXT GENERATED ALWAYS AS (
        UPPER(REGEXP_REPLACE(patente, '\s+', '', 'g'))
    ) STORED,
    capacidad_max       INTEGER NOT NULL,
    consumo_l_km        NUMERIC(6, 3) NOT NULL,
    estado              camion_estado NOT NULL DEFAULT 'activo',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT camiones_capacidad_positiva CHECK (capacidad_max >= 1),
    CONSTRAINT camiones_consumo_positivo   CHECK (consumo_l_km > 0),
    CONSTRAINT camiones_patente_no_vacia   CHECK (LENGTH(TRIM(patente)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS camiones_patente_normalizada_uniq
    ON camiones (patente_normalizada);

CREATE INDEX IF NOT EXISTS camiones_estado_idx
    ON camiones (estado);

-- Trigger updated_at
DROP TRIGGER IF EXISTS camiones_set_updated_at ON camiones;
CREATE TRIGGER camiones_set_updated_at
    BEFORE UPDATE ON camiones
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Trigger de inmutabilidad (INV-01) ─────────────────────────────────────
-- Rechaza cualquier UPDATE que intente modificar patente, capacidad_max o
-- consumo_l_km. La capa de aplicación también debe restringir esto, pero
-- la DB es la última línea de defensa.

CREATE OR REPLACE FUNCTION prevent_camion_immutable_fields_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.patente IS DISTINCT FROM OLD.patente THEN
        RAISE EXCEPTION 'INV-01: patente es inmutable (intento de cambio de "%" a "%")',
            OLD.patente, NEW.patente
            USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.capacidad_max IS DISTINCT FROM OLD.capacidad_max THEN
        RAISE EXCEPTION 'INV-01: capacidad_max es inmutable (intento de cambio de % a %)',
            OLD.capacidad_max, NEW.capacidad_max
            USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.consumo_l_km IS DISTINCT FROM OLD.consumo_l_km THEN
        RAISE EXCEPTION 'INV-01: consumo_l_km es inmutable (intento de cambio de % a %)',
            OLD.consumo_l_km, NEW.consumo_l_km
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS camiones_immutable_fields ON camiones;
CREATE TRIGGER camiones_immutable_fields
    BEFORE UPDATE ON camiones
    FOR EACH ROW EXECUTE FUNCTION prevent_camion_immutable_fields_update();

-- ============================================================================
-- TABLA: solicitudes
-- ============================================================================
-- Invariantes implicadas:
--   INV-05: cabezas >= 1, distancia_km > 0 (cuando no es NULL).
--   Origen != destino (validado en aplicación, no en DB, porque requiere
--   comparar pares de columnas con tolerancia y la regla es de UX).

CREATE TABLE IF NOT EXISTS solicitudes (
    id                    BIGSERIAL PRIMARY KEY,
    solicitante_nombre    TEXT NOT NULL,
    solicitante_contacto  TEXT,
    cabezas               INTEGER NOT NULL,

    origen_lat            NUMERIC(9, 6) NOT NULL,
    origen_lon            NUMERIC(9, 6) NOT NULL,
    origen_label          TEXT NOT NULL,

    destino_lat           NUMERIC(9, 6) NOT NULL,
    destino_lon           NUMERIC(9, 6) NOT NULL,
    destino_label         TEXT NOT NULL,

    -- Métricas de routing: nullable porque pueden no calcularse al inicio
    -- (servicio OSRM caído). Se completan vía recalculate-route endpoint.
    distancia_km          NUMERIC(8, 2),
    tiempo_estimado_min   INTEGER,

    estado                solicitud_estado NOT NULL DEFAULT 'pendiente',

    cancelada_at          TIMESTAMPTZ,
    motivo_cancelacion    TEXT,

    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT solicitudes_cabezas_positivas    CHECK (cabezas >= 1),
    CONSTRAINT solicitudes_distancia_positiva   CHECK (distancia_km IS NULL OR distancia_km > 0),
    CONSTRAINT solicitudes_tiempo_positivo      CHECK (tiempo_estimado_min IS NULL OR tiempo_estimado_min > 0),
    CONSTRAINT solicitudes_lat_origen_valida    CHECK (origen_lat  BETWEEN -90  AND 90),
    CONSTRAINT solicitudes_lon_origen_valida    CHECK (origen_lon  BETWEEN -180 AND 180),
    CONSTRAINT solicitudes_lat_destino_valida   CHECK (destino_lat BETWEEN -90  AND 90),
    CONSTRAINT solicitudes_lon_destino_valida   CHECK (destino_lon BETWEEN -180 AND 180),
    CONSTRAINT solicitudes_cancelacion_coherente CHECK (
        (estado = 'cancelada' AND cancelada_at IS NOT NULL)
        OR (estado <> 'cancelada' AND cancelada_at IS NULL)
    )
);

-- Índice principal: listados del dashboard ordenados por estado + recencia.
CREATE INDEX IF NOT EXISTS solicitudes_estado_created_at_idx
    ON solicitudes (estado, created_at DESC);

DROP TRIGGER IF EXISTS solicitudes_set_updated_at ON solicitudes;
CREATE TRIGGER solicitudes_set_updated_at
    BEFORE UPDATE ON solicitudes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- TABLA: asignaciones
-- ============================================================================
-- Invariantes implicadas:
--   INV-03: una solicitud tiene a lo sumo una asignación 'activa' a la vez.
--           idem para camión (no puede estar en dos asignaciones activas).
--   INV-04: snapshot de precio_litro y consumo al momento de la asignación.
--           El costo se calcula y persiste; no se recalcula nunca.
--
-- Snapshot columns:
--   distancia_km_aplicada, consumo_aplicado, precio_litro_aplicado,
--   cabezas_aplicadas, costo_combustible.
-- Estas columnas son la "verdad histórica" de cada asignación.

CREATE TABLE IF NOT EXISTS asignaciones (
    id                       BIGSERIAL PRIMARY KEY,
    solicitud_id             BIGINT NOT NULL REFERENCES solicitudes(id) ON DELETE RESTRICT,
    camion_id                BIGINT NOT NULL REFERENCES camiones(id)    ON DELETE RESTRICT,

    -- Snapshots (todos NOT NULL: una asignación sin snapshot no tiene sentido)
    cabezas_aplicadas        INTEGER       NOT NULL,
    distancia_km_aplicada    NUMERIC(8, 2) NOT NULL,
    consumo_aplicado         NUMERIC(6, 3) NOT NULL,
    precio_litro_aplicado    NUMERIC(10, 2) NOT NULL,
    costo_combustible        NUMERIC(12, 2) NOT NULL,

    -- Flag de regla de negocio BR-01: la asignación se permitió aunque
    -- las cabezas excedieran la capacidad.
    con_sobrecapacidad       BOOLEAN NOT NULL DEFAULT FALSE,

    estado                   asignacion_estado NOT NULL DEFAULT 'activa',

    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at                TIMESTAMPTZ,

    CONSTRAINT asignaciones_cabezas_positivas      CHECK (cabezas_aplicadas >= 1),
    CONSTRAINT asignaciones_distancia_positiva     CHECK (distancia_km_aplicada > 0),
    CONSTRAINT asignaciones_consumo_positivo       CHECK (consumo_aplicado > 0),
    CONSTRAINT asignaciones_precio_positivo        CHECK (precio_litro_aplicado > 0),
    CONSTRAINT asignaciones_costo_positivo         CHECK (costo_combustible > 0),
    CONSTRAINT asignaciones_closed_at_coherente    CHECK (
        (estado = 'activa' AND closed_at IS NULL)
        OR (estado <> 'activa' AND closed_at IS NOT NULL)
    )
);

-- INV-03 enforcement: unique parcial sobre asignaciones activas.
CREATE UNIQUE INDEX IF NOT EXISTS asignaciones_solicitud_activa_uniq
    ON asignaciones (solicitud_id)
    WHERE estado = 'activa';

CREATE UNIQUE INDEX IF NOT EXISTS asignaciones_camion_activa_uniq
    ON asignaciones (camion_id)
    WHERE estado = 'activa';

-- Índice para histórico por camión (US-09).
CREATE INDEX IF NOT EXISTS asignaciones_camion_created_at_idx
    ON asignaciones (camion_id, created_at DESC);

-- Índice para histórico por solicitud.
CREATE INDEX IF NOT EXISTS asignaciones_solicitud_created_at_idx
    ON asignaciones (solicitud_id, created_at DESC);

-- ============================================================================
-- TABLA: parametros + parametros_historial
-- ============================================================================
-- Diseño key/value con JSONB: permite agregar parámetros futuros (ej.
-- moneda por defecto, umbrales de alerta) sin migrations de schema.
-- El historial se mantiene en tabla separada para no inflar la principal.

CREATE TABLE IF NOT EXISTS parametros (
    clave         TEXT PRIMARY KEY,
    valor         JSONB NOT NULL,
    descripcion   TEXT,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS parametros_set_updated_at ON parametros;
CREATE TRIGGER parametros_set_updated_at
    BEFORE UPDATE ON parametros
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS parametros_historial (
    id              BIGSERIAL PRIMARY KEY,
    clave           TEXT NOT NULL,
    valor_anterior  JSONB,
    valor_nuevo     JSONB NOT NULL,
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS parametros_historial_clave_changed_at_idx
    ON parametros_historial (clave, changed_at DESC);

-- Trigger: cada UPDATE a parametros graba una fila en parametros_historial.
CREATE OR REPLACE FUNCTION log_parametro_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.valor IS DISTINCT FROM OLD.valor THEN
        INSERT INTO parametros_historial (clave, valor_anterior, valor_nuevo)
        VALUES (NEW.clave, OLD.valor, NEW.valor);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS parametros_audit ON parametros;
CREATE TRIGGER parametros_audit
    AFTER UPDATE ON parametros
    FOR EACH ROW EXECUTE FUNCTION log_parametro_change();

-- ============================================================================
-- DATOS SEMILLA
-- ============================================================================
-- Patrón: ON CONFLICT DO NOTHING para que un re-run del init.sql no duplique.

-- ── Parámetro inicial: precio del combustible ─────────────────────────────
INSERT INTO parametros (clave, valor, descripcion)
VALUES (
    'fuel_price_per_liter',
    jsonb_build_object('amount', 75.00, 'currency', 'UYU'),
    'Precio del litro de combustible. Snapshot persistido en cada asignación.'
) ON CONFLICT (clave) DO NOTHING;

-- ── Camiones de ejemplo ───────────────────────────────────────────────────
INSERT INTO camiones (patente, capacidad_max, consumo_l_km) VALUES
    ('ABC1234', 50, 0.420),
    ('XYZ9876', 80, 0.550),
    ('MER4521', 35, 0.380),
    ('SBA7700', 100, 0.620)
ON CONFLICT (patente_normalizada) DO NOTHING;

-- Damos de baja un camión para tener data realista (estado=inactivo).
UPDATE camiones SET estado = 'inactivo' WHERE patente_normalizada = 'SBA7700';

-- ── Solicitudes de ejemplo ────────────────────────────────────────────────
-- Coordenadas de localidades reales de Uruguay para que las rutas tengan
-- sentido geográfico.
INSERT INTO solicitudes (
    solicitante_nombre, solicitante_contacto, cabezas,
    origen_lat, origen_lon, origen_label,
    destino_lat, destino_lon, destino_label,
    distancia_km, tiempo_estimado_min, estado
) VALUES
    ('Estancia La Paz',      '+598 99 111 222',  40,
     -31.7167, -55.9833, 'Tacuarembó, UY',
     -34.0982, -56.2144, 'Florida, UY',
     352.40, 280, 'pendiente'),

    ('Cabaña Don Pedro',     '+598 98 333 444',  75,
     -32.3833, -54.1833, 'Melo, UY',
     -34.9011, -56.1645, 'Montevideo, UY',
     387.20, 310, 'pendiente'),

    ('Frigorífico del Este', '+598 97 555 666',  120,
     -34.4818, -54.3340, 'Maldonado, UY',
     -34.9011, -56.1645, 'Montevideo, UY',
     132.50, 95, 'asignada'),

    ('Estancia Los Olivos',  '+598 99 777 888',  25,
     -33.2524, -58.0263, 'Paysandú, UY',
     -31.3833, -57.9667, 'Salto, UY',
     117.80, 90, 'completada'),

    ('Ganadera Rincón',      '+598 96 999 000',  60,
     -33.4500, -56.4000, 'Durazno, UY',
     -34.9011, -56.1645, 'Montevideo, UY',
     183.60, 145, 'pendiente')
ON CONFLICT DO NOTHING;

-- ── Asignación de ejemplo (para la solicitud en estado 'asignada') ──────
-- Frigorífico del Este (120 cabezas, 132.50 km) → camión XYZ9876 (cap 80, consumo 0.550).
-- HAY sobrecapacidad: 120 > 80.
-- Costo = 132.50 * 0.550 * 75.00 = 5465.625 → 5465.63
INSERT INTO asignaciones (
    solicitud_id, camion_id,
    cabezas_aplicadas, distancia_km_aplicada, consumo_aplicado,
    precio_litro_aplicado, costo_combustible,
    con_sobrecapacidad, estado
)
SELECT
    s.id, c.id,
    120, 132.50, 0.550,
    75.00, 5465.63,
    TRUE, 'activa'
FROM solicitudes s, camiones c
WHERE s.solicitante_nombre = 'Frigorífico del Este'
  AND c.patente_normalizada = 'XYZ9876'
  AND NOT EXISTS (
      SELECT 1 FROM asignaciones a WHERE a.solicitud_id = s.id
  )
LIMIT 1;

-- ── Asignación histórica para la solicitud completada ──────────────────
-- Estancia Los Olivos (25 cabezas, 117.80 km) → camión MER4521 (cap 35, consumo 0.380).
-- Costo = 117.80 * 0.380 * 75.00 = 3357.30
INSERT INTO asignaciones (
    solicitud_id, camion_id,
    cabezas_aplicadas, distancia_km_aplicada, consumo_aplicado,
    precio_litro_aplicado, costo_combustible,
    con_sobrecapacidad, estado, closed_at
)
SELECT
    s.id, c.id,
    25, 117.80, 0.380,
    75.00, 3357.30,
    FALSE, 'completada', NOW() - INTERVAL '2 days'
FROM solicitudes s, camiones c
WHERE s.solicitante_nombre = 'Estancia Los Olivos'
  AND c.patente_normalizada = 'MER4521'
  AND NOT EXISTS (
      SELECT 1 FROM asignaciones a WHERE a.solicitud_id = s.id
  )
LIMIT 1;

-- ============================================================================
-- VISTAS DE CONVENIENCIA
-- ============================================================================
-- v_solicitudes_dashboard: payload listo para el dashboard. Une solicitud con
-- su asignación activa (si tiene) y datos del camión asignado.

CREATE OR REPLACE VIEW v_solicitudes_dashboard AS
SELECT
    s.id,
    s.solicitante_nombre,
    s.solicitante_contacto,
    s.cabezas,
    s.origen_label,
    s.destino_label,
    s.origen_lat, s.origen_lon,
    s.destino_lat, s.destino_lon,
    s.distancia_km,
    s.tiempo_estimado_min,
    s.estado,
    s.created_at,
    a.id              AS asignacion_id,
    a.costo_combustible,
    a.con_sobrecapacidad,
    c.id              AS camion_id,
    c.patente         AS camion_patente,
    c.capacidad_max   AS camion_capacidad
FROM solicitudes s
LEFT JOIN asignaciones a
    ON a.solicitud_id = s.id AND a.estado = 'activa'
LEFT JOIN camiones c
    ON c.id = a.camion_id;

COMMENT ON VIEW v_solicitudes_dashboard IS
'Payload denormalizado del dashboard. Une solicitud con su asignación activa y camión actual.';

-- ============================================================================
-- FIN init.sql
-- ============================================================================
