/**
 * Lógica pura de evaluación de capacidad para asignaciones.
 *
 * Realiza la regla de negocio BR-01: sobrecapacidad se permite con alerta
 * y sugerencias accionables.
 */

export interface CapacityEvaluation {
  /** ¿La capacidad del camión es insuficiente para las cabezas solicitadas? */
  excedida: boolean;
  /** Cabezas en exceso (0 cuando no hay sobrecapacidad). */
  excedente: number;
  /** Cantidad mínima de viajes necesarios para mover toda la carga con el camión dado. */
  viajesNecesarios: number;
  /** Capacidad que sobra (0 cuando hay sobrecapacidad o ajuste exacto). */
  capacidadSobrante: number;
}

/**
 * Evalúa si la capacidad de un camión alcanza para mover N cabezas.
 *
 * @throws Error si los inputs son no positivos o no enteros.
 */
export function evaluarSobrecapacidad(
  cabezas: number,
  capacidadCamion: number,
): CapacityEvaluation {
  assertPositiveInteger('cabezas', cabezas);
  assertPositiveInteger('capacidadCamion', capacidadCamion);

  if (cabezas <= capacidadCamion) {
    return {
      excedida: false,
      excedente: 0,
      viajesNecesarios: 1,
      capacidadSobrante: capacidadCamion - cabezas,
    };
  }

  return {
    excedida: true,
    excedente: cabezas - capacidadCamion,
    viajesNecesarios: Math.ceil(cabezas / capacidadCamion),
    capacidadSobrante: 0,
  };
}

/**
 * Dado un set de camiones candidatos, devuelve los que tienen capacidad
 * suficiente, ordenados por "mejor ajuste" (menor sobra primero).
 */
export interface TruckCandidate {
  id: number;
  patente: string;
  capacidadMax: number;
  consumoLKm: number;
}

export function sugerirCamionesAlternativos(
  cabezas: number,
  camiones: TruckCandidate[],
): TruckCandidate[] {
  assertPositiveInteger('cabezas', cabezas);
  return camiones
    .filter((c) => c.capacidadMax >= cabezas)
    .sort((a, b) => a.capacidadMax - b.capacidadMax);
}

function assertPositiveInteger(name: string, value: number): void {
  if (!Number.isInteger(value)) {
    throw new Error(`${name} debe ser un entero (recibido: ${value}).`);
  }
  if (value <= 0) {
    throw new Error(`${name} debe ser mayor a 0 (recibido: ${value}).`);
  }
}
