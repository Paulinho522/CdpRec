import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as XLSX from 'xlsx';

const neqMock = vi.fn();
const deleteMock = vi.fn(() => ({ neq: neqMock }));
const insertMock = vi.fn();
const fromMock = vi.fn(() => ({ delete: deleteMock, insert: insertMock }));

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({ from: fromMock }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SESSION_SECRET = 'chave-de-teste-bem-comprida';
  neqMock.mockResolvedValue({ error: null });
  insertMock.mockResolvedValue({ error: null });
});

async function authCookieHeader() {
  const { createSessionToken, SESSION_COOKIE_NAME } = await import('@/lib/auth');
  return `${SESSION_COOKIE_NAME}=${createSessionToken()}`;
}

function buildXlsxFile(): File {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Categoria', 'Nome', 'Codigo'],
    ['Rua', 'BESSA', 'A'],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, '4100');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new File([buffer], 'update.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

describe('POST /api/import', () => {
  it('rejects when not authenticated', async () => {
    const { POST } = await import('./route');
    const formData = new FormData();
    formData.set('file', buildXlsxFile());
    const request = new Request('http://localhost/api/import', {
      method: 'POST',
      body: formData,
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('replaces all rows when authenticated', async () => {
    const formData = new FormData();
    formData.set('file', buildXlsxFile());
    const request = new Request('http://localhost/api/import', {
      method: 'POST',
      body: formData,
      headers: { Cookie: await authCookieHeader() },
    });

    const { POST } = await import('./route');
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.count).toBe(1);
    expect(deleteMock).toHaveBeenCalled();
    expect(insertMock).toHaveBeenCalledWith([
      expect.objectContaining({ zona: '4100', nome: 'BESSA', circuito: '4100A' }),
    ]);
  });
});
