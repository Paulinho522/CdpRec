import { describe, it, expect, beforeEach } from 'vitest';

beforeEach(() => {
  process.env.ADMIN_PASSWORD = 'segredo123';
  process.env.SESSION_SECRET = 'chave-de-teste-bem-comprida';
});

describe('POST /api/admin/login', () => {
  it('rejects wrong password', async () => {
    const { POST } = await import('./route');
    const request = new Request('http://localhost/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password: 'errada' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('accepts the right password and sets a session cookie', async () => {
    const { POST } = await import('./route');
    const request = new Request('http://localhost/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password: 'segredo123' }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(response.headers.get('set-cookie')).toMatch(/recolhas_admin_session=/);
  });
});
