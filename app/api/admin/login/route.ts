import { isCorrectPassword, createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST(request: Request) {
  const { password } = await request.json();

  if (!password || !isCorrectPassword(password)) {
    return Response.json({ error: 'Password incorreta' }, { status: 401 });
  }

  const token = createSessionToken();
  const response = Response.json({ ok: true });
  response.headers.set(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`
  );
  return response;
}
