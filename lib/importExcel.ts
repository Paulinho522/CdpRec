import * as XLSX from 'xlsx';
import { normalizeCircuito } from './normalize';
import type { MoradaInput } from './types';

export function parseWorkbookToRows(workbook: XLSX.WorkBook): MoradaInput[] {
  const rows: MoradaInput[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json<(string | null)[]>(sheet, {
      header: 1,
      defval: null,
    });

    // Skip header row (first row: Categoria, Nome, Codigo)
    for (const row of raw.slice(1)) {
      const [categoria, nome, codigo] = row;
      if (!categoria && !nome && !codigo) continue;

      const categoriaStr = categoria ? String(categoria).trim() : '';
      const nomeStr = nome ? String(nome).trim() : '';
      const codigoBrutoStr = codigo ? String(codigo).trim() : '';

      if (!categoriaStr && !nomeStr) continue;

      rows.push({
        zona: sheetName,
        categoria: categoriaStr,
        nome: nomeStr,
        codigo_bruto: codigoBrutoStr,
        circuito: normalizeCircuito(sheetName, codigoBrutoStr),
      });
    }
  }

  return rows;
}
