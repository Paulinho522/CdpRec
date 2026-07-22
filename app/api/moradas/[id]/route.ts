import { getSupabaseClient } from '@/lib/supabase';
import { normalizeCircuito } from '@/lib/normalize';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthenticated(request)) {
    return Response.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { zona, categoria, nome, codigo_bruto } = body;

  if (!zona || !nome) {
    return Response.json({ error: 'zona e nome são obrigatórios' }, { status: 400 });
  }

  const circuito = normalizeCircuito(zona, codigo_bruto ?? '');

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('moradas')
    .update({
      zona,
      categoria: categoria ?? '',
      nome,
      codigo_bruto: codigo_bruto ?? '',
      circuito,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ morada: data });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthenticated(request)) {
    return Response.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('moradas').delete().eq('id', id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
