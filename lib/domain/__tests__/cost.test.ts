import { describe, it, expect } from 'vitest';
import { calcularCostoCombustible } from '../cost';

describe('calcularCostoCombustible', () => {
  it('calcula correctamente el caso nominal del BACKLOG', () => {
    // US-13 escenario 1: 520 km × 0.45 L/Km × 75 = 17 550 (moneda-agnóstico)
    const { costoTotal, litrosConsumidos } = calcularCostoCombustible({
      distanciaKm: 520,
      consumoLKm: 0.45,
      precioLitro: 75,
    });
    expect(costoTotal).toBe(17550);
    expect(litrosConsumidos).toBe(234);
  });

  it('redondea a 2 decimales (centavos)', () => {
    // 132.50 × 0.550 × 75.00 = 5465.625 → 5465.63
    const { costoTotal } = calcularCostoCombustible({
      distanciaKm: 132.5,
      consumoLKm: 0.55,
      precioLitro: 75,
    });
    expect(costoTotal).toBe(5465.63);
  });

  it('lanza error si distancia es 0', () => {
    expect(() =>
      calcularCostoCombustible({ distanciaKm: 0, consumoLKm: 0.5, precioLitro: 75 }),
    ).toThrow(/distanciaKm/);
  });

  it('lanza error si consumo es negativo', () => {
    expect(() =>
      calcularCostoCombustible({ distanciaKm: 100, consumoLKm: -0.1, precioLitro: 75 }),
    ).toThrow(/consumoLKm/);
  });

  it('lanza error si precio es Infinity', () => {
    expect(() =>
      calcularCostoCombustible({
        distanciaKm: 100,
        consumoLKm: 0.5,
        precioLitro: Number.POSITIVE_INFINITY,
      }),
    ).toThrow(/precioLitro/);
  });

  it('lanza error si precio es NaN', () => {
    expect(() =>
      calcularCostoCombustible({ distanciaKm: 100, consumoLKm: 0.5, precioLitro: NaN }),
    ).toThrow(/precioLitro/);
  });
});
