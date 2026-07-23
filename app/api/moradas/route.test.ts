import { describe, it, expect, vi, beforeEach } from 'vitest';

const rangeMock = vi.fn();
const selectMock = vi.fn(() => ({ range: rangeMock }));
const insertMock = vi.fn();
const fromMock = vi.fn(() => ({ select: selectMock, insert: insertMock }));

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({ from: fromMock }),
}));

const sampleRows = [
  {
    id: '1',
    zona: '4100',
    categoria: 'Rua',
    nome: 'BESSA',
    codigo_bruto: 'A',
    circuito: '4100A',
    criado_em: '2026-01-01',
    atualizado_em: '2026-01-01',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  selectMock.mockImplementation(() => ({ range: rangeMock }));
  rangeMock.mockResolvedValue({ data: sampleRows, error: null });
});

describe('GET /api/moradas', () => {
  it('returns all moradas filtered by query and zona', async () => {
    const { GET } = await import('./route');
    const request = new Request('http://localhost/api/moradas?q=bessa');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.moradas).toHaveLength(1);
    expect(body.moradas[0].nome).toBe('BESSA');
  });

  it('returns empty array when nothing matches', async () => {
    const { GET } = await import('./route');
    const request = new Request('http://localhost/api/moradas?q=inexistente');
    const response = await GET(request);
    const body = await response.json();

    expect(body.moradas).toHaveLength(0);
  });
});

describe('POST /api/moradas', () => {
  it('rejects when there is no valid session cookie', async () => {
    const { POST } = await import('./route');
    const request = new Request('http://localhost/api/moradas', {
      method: 'POST',
      body: JSON.stringify({ zona: '4100', categoria: 'Rua', nome: 'NOVA', codigo_bruto: 'A' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('creates a morada with a normalized circuito when authenticated', async () => {
    process.env.SESSION_SECRET = 'chave-de-teste-bem-comprida';
    const { createSessionToken, SESSION_COOKIE_NAME } = await import('@/lib/auth');
    const token = createSessionToken();

    insertMock.mockReturnValue({
      select: () => ({
        single: () =>
          Promise.resolve({
            data: {
              id: '2',
              zona: '4100',
              categoria: 'Rua',
              nome: 'NOVA',
              codigo_bruto: 'A',
              circuito: '4100A',
              criado_em: '2026-01-01',
              atualizado_em: '2026-01-01',
            },
            error: null,
          }),
      }),
    });

    const { POST } = await import('./route');
    const request = new Request('http://localhost/api/moradas', {
      method: 'POST',
      body: JSON.stringify({ zona: '4100', categoria: 'Rua', nome: 'NOVA', codigo_bruto: 'A' }),
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.morada.circuito).toBe('4100A');
  });
});
