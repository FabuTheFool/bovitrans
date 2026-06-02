/**
 * Lógica pura de cálculo de costo de combustible.
 *
 * Sin dependencias externas, sin I/O, sin DB. Determinística para los
 * mismos inputs. Esto hace que la regla de negocio BR-04 sea trivialmente
 * testeable y no dependa de la infraestructura.
 *
 * Regla: Costo = distancia(Km) × consumo(L/Km) × precio_litro
 * Persistencia: la cifra final se redondea a 2 decimales (centavos).
 */

export interface FuelCostInput {
  distanciaKm: number;
  consumoLKm: number;
  precioLitro: number;
}

export interface FuelCostBreakdown {
  costoTotal: number;
  litrosConsumidos: number;
  inputs: FuelCostInput;
}

/**
 * Calcula el costo de combustible de un viaje y los litros consumidos.
 *
 * @throws Error si algún input es no positivo o no finito.
 *         El llamador es responsable de validar antes; este throw es la
 *         última red de seguridad.
 */
export function calcularCostoCombustible(input: FuelCostInput): FuelCostBreakdown {
  const { distanciaKm, consumoLKm, precioLitro } = input;

  assertPositiveFinite('distanciaKm', distanciaKm);
  assertPositiveFinite('consumoLKm', consumoLKm);
  assertPositiveFinite('precioLitro', precioLitro);

  const litrosConsumidos = distanciaKm * consumoLKm;
  const costoTotal = redondear2(litrosConsumidos * precioLitro);

  return {
    costoTotal,
    litrosConsumidos: redondear2(litrosConsumidos),
    inputs: input,
  };
}

function assertPositiveFinite(name: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} debe ser un número finito (recibido: ${value}).`);
  }
  if (value <= 0) {
    throw new Error(`${name} debe ser mayor a 0 (recibido: ${value}).`);
  }
}

/**
 * Redondeo a 2 decimales con corrección de epsilon de punto flotante.
 * Number((0.1+0.2).toFixed(2)) → 0.30, sin "0.30000000000000004".
 */
function redondear2(value: number): number {
  return Math.round(value * 100) / 100;
}
