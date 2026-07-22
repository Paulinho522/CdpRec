import { getSupabaseClient } from '@/lib/supabase';
import { filterMoradas } from '@/lib/search';
import { normalizeCircuito } from '@/lib/normalize';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import type { Morada } from '@/lib/types';

function getCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get('cookie');
  if (!header) return undefined;
  const match = header
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  return match?.split('=')[1];
}

function isAuthenticated(request: Request): boolean {
  return verifySessionToken(getCookie(request, SESSION_COOKIE_NAME));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') ?? '';
  const zona = searchParams.get('zona') ?? undefined;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('moradas').select('*');

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const moradas = filterMoradas((data ?? []) as Morada[], q, zona);
  return Response.json({ moradas });
}

export async function POST(request: Request) {
  if (!isAuthenticated(request)) {
    return Response.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const body = await request.json();
  const { zona, categoria, nome, codigo_bruto } = body;

  if (!zona || !nome) {
    return Response.json({ error: 'zona e nome são obrigatórios' }, { status: 400 });
  }

  const circuito = normalizeCircuito(zona, codigo_bruto ?? '');

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('moradas')
    .insert({
      zona,
      categoria: categoria ?? '',
      nome,
      codigo_bruto: codigo_bruto ?? '',
      circuito,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ morada: data }, { status: 201 });
}
