import { describe, it, expect, vi, beforeEach } from 'vitest';

const eqMock = vi.fn();
const updateMock = vi.fn(() => ({ eq: eqMock }));
const deleteEqMock = vi.fn();
const deleteMock = vi.fn(() => ({ eq: deleteEqMock }));
const fromMock = vi.fn(() => ({ update: updateMock, delete: deleteMock }));

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({ from: fromMock }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SESSION_SECRET = 'chave-de-teste-bem-comprida';
});

async function authCookieHeader() {
  const { createSessionToken, SESSION_COOKIE_NAME } = await import('@/lib/auth');
  return `${SESSION_COOKIE_NAME}=${createSessionToken()}`;
}

describe('PUT /api/moradas/[id]', () => {
  it('rejects when not authenticated', async () => {
    const { PUT } = await import('./route');
    const request = new Request('http://localhost/api/moradas/1', {
      method: 'PUT',
      body: JSON.stringify({ zona: '4100', categoria: 'Rua', nome: 'X', codigo_bruto: 'A' }),
    });
    const response = await PUT(request, { params: Promise.resolve({ id: '1' }) });
    expect(response.status).toBe(401);
  });

  it('updates and recomputes circuito when authenticated', async () => {
    eqMock.mockReturnValue({
      select: () => ({
        single: () =>
          Promise.resolve({
            data: {
              id: '1',
              zona: '4100',
              categoria: 'Rua',
              nome: 'X',
              codigo_bruto: 'B',
              circuito: '4100B',
              criado_em: '2026-01-01',
              atualizado_em: '2026-01-02',
            },
            error: null,
          }),
      }),
    });

    const { PUT } = await import('./route');
    const request = new Request('http://localhost/api/moradas/1', {
      method: 'PUT',
      body: JSON.stringify({ zona: '4100', categoria: 'Rua', nome: 'X', codigo_bruto: 'B' }),
      headers: { Cookie: await authCookieHeader() },
    });
    const response = await PUT(request, { params: Promise.resolve({ id: '1' }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.morada.circuito).toBe('4100B');
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ circuito: '4100B' })
    );
  });
});

describe('DELETE /api/moradas/[id]', () => {
  it('rejects when not authenticated', async () => {
    const { DELETE } = await import('./route');
    const request = new Request('http://localhost/api/moradas/1', { method: 'DELETE' });
    const response = await DELETE(request, { params: Promise.resolve({ id: '1' }) });
    expect(response.status).toBe(401);
  });

  it('deletes when authenticated', async () => {
    deleteEqMock.mockResolvedValue({ error: null });

    const { DELETE } = await import('./route');
    const request = new Request('http://localhost/api/moradas/1', {
      method: 'DELETE',
      headers: { Cookie: await authCookieHeader() },
    });
    const response = await DELETE(request, { params: Promise.resolve({ id: '1' }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(deleteEqMock).toHaveBeenCalledWith('id', '1');
  });
});
