import { describe, it, expect } from 'vitest';
import { evaluarSobrecapacidad, sugerirCamionesAlternativos } from '../capacity';

describe('evaluarSobrecapacidad', () => {
  it('no marca sobrecapacidad cuando cabezas < capacidad', () => {
    const r = evaluarSobrecapacidad(30, 50);
    expect(r.excedida).toBe(false);
    expect(r.excedente).toBe(0);
    expect(r.viajesNecesarios).toBe(1);
    expect(r.capacidadSobrante).toBe(20);
  });

  it('borde exacto: cabezas == capacidad → 1 viaje, sin alerta', () => {
    const r = evaluarSobrecapacidad(50, 50);
    expect(r.excedida).toBe(false);
    expect(r.viajesNecesarios).toBe(1);
    expect(r.capacidadSobrante).toBe(0);
  });

  it('marca sobrecapacidad y calcula viajes necesarios (US-15)', () => {
    // 80 cabezas, capacidad 50 → ceil(80/50)=2 viajes
    const r = evaluarSobrecapacidad(80, 50);
    expect(r.excedida).toBe(true);
    expect(r.excedente).toBe(30);
    expect(r.viajesNecesarios).toBe(2);
  });

  it('sobrecapacidad masiva: 150 cabezas / 35 cap → 5 viajes', () => {
    const r = evaluarSobrecapacidad(150, 35);
    expect(r.viajesNecesarios).toBe(5);
    expect(r.excedente).toBe(115);
  });

  it('lanza error con cabezas no enteras', () => {
    expect(() => evaluarSobrecapacidad(10.5, 50)).toThrow(/entero/);
  });

  it('lanza error con valores no positivos', () => {
    expect(() => evaluarSobrecapacidad(0, 50)).toThrow(/mayor a 0/);
    expect(() => evaluarSobrecapacidad(10, 0)).toThrow(/mayor a 0/);
  });
});

describe('sugerirCamionesAlternativos', () => {
  const camiones = [
    { id: 1, patente: 'AAA1111', capacidadMax: 30, consumoLKm: 0.4 },
    { id: 2, patente: 'BBB2222', capacidadMax: 80, consumoLKm: 0.55 },
    { id: 3, patente: 'CCC3333', capacidadMax: 100, consumoLKm: 0.62 },
    { id: 4, patente: 'DDD4444', capacidadMax: 50, consumoLKm: 0.42 },
  ];

  it('filtra los que tienen capacidad suficiente y ordena por mejor ajuste', () => {
    const r = sugerirCamionesAlternativos(75, camiones);
    expect(r.map((c) => c.patente)).toEqual(['BBB2222', 'CCC3333']);
  });

  it('devuelve vacío si ninguno alcanza', () => {
    const r = sugerirCamionesAlternativos(500, camiones);
    expect(r).toEqual([]);
  });

  it('incluye el de capacidad exacta', () => {
    const r = sugerirCamionesAlternativos(50, camiones);
    expect(r[0].patente).toBe('DDD4444');
  });
});
