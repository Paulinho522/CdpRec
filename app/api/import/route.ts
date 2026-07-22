import * as XLSX from 'xlsx';
import { parseWorkbookToRows } from '@/lib/importExcel';
import { getSupabaseClient } from '@/lib/supabase';
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

export async function POST(request: Request) {
  if (!isAuthenticated(request)) {
    return Response.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return Response.json({ error: 'Ficheiro em falta' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(Buffer.from(arrayBuffer), { type: 'buffer' });
  const rows = parseWorkbookToRows(workbook);

  const supabase = getSupabaseClient();

  const { error: deleteError } = await supabase
    .from('moradas')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (deleteError) {
    return Response.json({ error: deleteError.message }, { status: 500 });
  }

  const { error: insertError } = await supabase.from('moradas').insert(rows);
  if (insertError) {
    return Response.json({ error: insertError.message }, { status: 500 });
  }

  return Response.json({ ok: true, count: rows.length });
}
