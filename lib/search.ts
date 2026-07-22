import type { Morada } from './types';

export function normalizeSearchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function filterMoradas(
  rows: Morada[],
  query: string,
  zona?: string
): Morada[] {
  const normalizedQuery = normalizeSearchText(query);
  return rows.filter((row) => {
    if (zona && row.zona !== zona) return false;
    if (!normalizedQuery) return true;
    const haystack = normalizeSearchText(
      `${row.nome} ${row.categoria} ${row.circuito}`
    );
    return haystack.includes(normalizedQuery);
  });
}
