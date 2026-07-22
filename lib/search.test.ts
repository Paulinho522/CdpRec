import { describe, it, expect } from 'vitest';
import { normalizeSearchText, filterMoradas } from './search';
import type { Morada } from './types';

describe('normalizeSearchText', () => {
  it('lowercases and strips accents', () => {
    expect(normalizeSearchText('Fundação')).toBe('fundacao');
    expect(normalizeSearchText('AÇUCAREIRA')).toBe('acucareira');
    expect(normalizeSearchText('  Água Férreas  ')).toBe('agua ferreas');
  });
});

function makeMorada(overrides: Partial<Morada>): Morada {
  return {
    id: '1',
    zona: '4100',
    categoria: 'Rua',
    nome: 'FUNDAÇÃO',
    codigo_bruto: 'A',
    circuito: '4100A',
    criado_em: '2026-01-01',
    atualizado_em: '2026-01-01',
    ...overrides,
  };
}

describe('filterMoradas', () => {
  const rows: Morada[] = [
    makeMorada({ id: '1', nome: 'FUNDAÇÃO', zona: '4100', circuito: '4100A' }),
    makeMorada({ id: '2', nome: 'BOAVISTA', zona: '4100', categoria: 'Avenida', circuito: '4100D' }),
    makeMorada({ id: '3', nome: 'BOAVISTA', zona: '4200', categoria: 'Avenida', circuito: '4200C' }),
    makeMorada({ id: '4', nome: 'CUSTOIAS', zona: '4450-4460', categoria: 'Freguesia', circuito: '4450-4460R' }),
  ];

  it('matches by nome, accent- and case-insensitive', () => {
    const result = filterMoradas(rows, 'fundacao');
    expect(result.map((r) => r.id)).toEqual(['1']);
  });

  it('matches partial text', () => {
    const result = filterMoradas(rows, 'boavist');
    expect(result.map((r) => r.id).sort()).toEqual(['2', '3']);
  });

  it('filters by zona when provided', () => {
    const result = filterMoradas(rows, 'boavista', '4200');
    expect(result.map((r) => r.id)).toEqual(['3']);
  });

  it('matches by circuito text too', () => {
    const result = filterMoradas(rows, '4100a');
    expect(result.map((r) => r.id)).toEqual(['1']);
  });

  it('returns all rows when query is empty', () => {
    expect(filterMoradas(rows, '')).toHaveLength(4);
  });
});
