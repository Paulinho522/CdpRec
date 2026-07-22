import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseWorkbookToRows } from './importExcel';

function buildWorkbook(sheets: Record<string, (string | null)[][]>): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  for (const [sheetName, rows] of Object.entries(sheets)) {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }
  return wb;
}

describe('parseWorkbookToRows', () => {
  it('skips the header row and maps columns per sheet', () => {
    const wb = buildWorkbook({
      '4100': [
        ['Categoria', 'Nome', 'Codigo'],
        ['Rua', 'BESSA', 'A'],
        ['Avenida', 'BOAVISTA', 'D'],
      ],
    });

    const rows = parseWorkbookToRows(wb);

    expect(rows).toEqual([
      {
        zona: '4100',
        categoria: 'Rua',
        nome: 'BESSA',
        codigo_bruto: 'A',
        circuito: '4100A',
      },
      {
        zona: '4100',
        categoria: 'Avenida',
        nome: 'BOAVISTA',
        codigo_bruto: 'D',
        circuito: '4100D',
      },
    ]);
  });

  it('reads every sheet, using the sheet name as zona', () => {
    const wb = buildWorkbook({
      '4100': [
        ['Categoria', 'Nome', 'Codigo'],
        ['Rua', 'BESSA', 'A'],
      ],
      '4200': [
        ['Categoria', 'Nome', 'Codigo'],
        ['Avenida', 'FRANÇA', 'A'],
      ],
    });

    const rows = parseWorkbookToRows(wb);

    expect(rows.map((r) => r.zona)).toEqual(['4100', '4200']);
  });

  it('handles a missing/empty Codigo cell as empty codigo_bruto and empty circuito', () => {
    const wb = buildWorkbook({
      '4100': [
        ['Categoria', 'Nome', 'Codigo'],
        ['Nota', 'CACIFO DIOGO BOTELHO - 4100G', null],
      ],
    });

    const rows = parseWorkbookToRows(wb);

    expect(rows).toEqual([
      {
        zona: '4100',
        categoria: 'Nota',
        nome: 'CACIFO DIOGO BOTELHO - 4100G',
        codigo_bruto: '',
        circuito: '',
      },
    ]);
  });

  it('keeps already-complete codes as-is via normalizeCircuito', () => {
    const wb = buildWorkbook({
      '4480': [
        ['Categoria', 'Nome', 'Codigo'],
        ['Cliente', 'BLUME FOR HOME-R BACELO', 'OPE07'],
      ],
    });

    const rows = parseWorkbookToRows(wb);

    expect(rows[0].circuito).toBe('OPE07');
  });

  it('skips fully blank rows', () => {
    const wb = buildWorkbook({
      '4100': [
        ['Categoria', 'Nome', 'Codigo'],
        ['Rua', 'BESSA', 'A'],
        [null, null, null],
      ],
    });

    const rows = parseWorkbookToRows(wb);

    expect(rows).toHaveLength(1);
  });
});
