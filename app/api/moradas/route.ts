import { getSupabaseClient } from '@/lib/supabase';
import { filterMoradas } from '@/lib/search';
import { normalizeCircuito } from '@/lib/normalize';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import type { Morada } from '@/lib/types';
import type { SupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 1000;

// PostgREST caps each request at 1000 rows by default; page through until
// a short page tells us we've reached the end.
async function fetchAllMoradas(
  supabase: SupabaseClient
): Promise<{ data: Morada[] | null; error: { message: string } | null }> {
  const rows: Morada[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('moradas')
      .select('*')
      .range(from, from + PAGE_SIZE - 1);

    if (error) return { data: null, error };
    if (!data || data.length === 0) break;

    rows.push(...(data as Morada[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return { data: rows, error: null };
}

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
  const { data, error } = await fetchAllMoradas(supabase);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const moradas = filterMoradas(data ?? [], q, zona);
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
