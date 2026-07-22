const SINGLE_LETTER = /^[A-Za-zÀ-ÿ]$/;

export function normalizeCircuito(
  zona: string,
  codigoBruto: string | null | undefined
): string {
  if (!codigoBruto) return '';
  const trimmed = codigoBruto.trim();
  if (!trimmed) return '';
  if (SINGLE_LETTER.test(trimmed)) {
    return `${zona}${trimmed.toUpperCase()}`;
  }
  return trimmed;
}
