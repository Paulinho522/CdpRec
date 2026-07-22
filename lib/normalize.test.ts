import { describe, it, expect } from 'vitest';
import { normalizeCircuito } from './normalize';

describe('normalizeCircuito', () => {
  it('returns empty string when codigoBruto is empty/null/undefined', () => {
    expect(normalizeCircuito('4100', '')).toBe('');
    expect(normalizeCircuito('4100', null)).toBe('');
    expect(normalizeCircuito('4100', undefined)).toBe('');
    expect(normalizeCircuito('4100', '   ')).toBe('');
  });

  it('prepends zona when codigoBruto is a single letter', () => {
    expect(normalizeCircuito('4100', 'A')).toBe('4100A');
    expect(normalizeCircuito('4100', 'a')).toBe('4100A');
    expect(normalizeCircuito('4200', 'z')).toBe('4200Z');
  });

  it('keeps already-complete codes as-is', () => {
    expect(normalizeCircuito('4480', 'OPE07')).toBe('OPE07');
    expect(normalizeCircuito('4605-4630 Rural', 'EV922')).toBe('EV922');
    expect(normalizeCircuito('4100', '4100A')).toBe('4100A');
    expect(normalizeCircuito('4100', 'RSBS1')).toBe('RSBS1');
  });

  it('keeps messy values as-is', () => {
    expect(normalizeCircuito('4200', '?')).toBe('?');
    expect(normalizeCircuito('4490', 'N/H')).toBe('N/H');
    expect(normalizeCircuito('4000 (parte 1)', 'B / E (Bragrito)')).toBe('B / E (Bragrito)');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeCircuito('4100', '  A  ')).toBe('4100A');
    expect(normalizeCircuito('4480', '  OPE07  ')).toBe('OPE07');
  });
});
