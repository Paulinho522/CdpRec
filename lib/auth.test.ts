import { describe, it, expect, beforeEach } from 'vitest';

const OLD_ENV = process.env;

beforeEach(() => {
  process.env = {
    ...OLD_ENV,
    ADMIN_PASSWORD: 'segredo123',
    SESSION_SECRET: 'chave-de-teste-bem-comprida',
  };
});

describe('auth', () => {
  it('isCorrectPassword matches the ADMIN_PASSWORD env var', async () => {
    const { isCorrectPassword } = await import('./auth');
    expect(isCorrectPassword('segredo123')).toBe(true);
    expect(isCorrectPassword('errada')).toBe(false);
  });

  it('createSessionToken produces a token that verifySessionToken accepts', async () => {
    const { createSessionToken, verifySessionToken } = await import('./auth');
    const token = createSessionToken();
    expect(verifySessionToken(token)).toBe(true);
  });

  it('verifySessionToken rejects tampered or missing tokens', async () => {
    const { createSessionToken, verifySessionToken } = await import('./auth');
    const token = createSessionToken();
    expect(verifySessionToken(token + 'x')).toBe(false);
    expect(verifySessionToken(undefined)).toBe(false);
    expect(verifySessionToken(null)).toBe(false);
    expect(verifySessionToken('')).toBe(false);
  });
});
