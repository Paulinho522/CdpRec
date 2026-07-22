import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { parseWorkbookToRows } from '../lib/importExcel';
import { getSupabaseClient } from '../lib/supabase';

async function main() {
  const filePath = path.resolve(__dirname, '..', 'codigos_postais_ruas.xlsx');
  const buffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  const rows = parseWorkbookToRows(workbook);

  const countsBySheet: Record<string, number> = {};
  for (const sheetName of workbook.SheetNames) {
    countsBySheet[sheetName] = rows.filter((r) => r.zona === sheetName).length;
  }
  console.log('Linhas por folha (após ignorar cabeçalho e linhas em branco):');
  for (const [sheet, count] of Object.entries(countsBySheet)) {
    console.log(`  ${sheet}: ${count}`);
  }
  console.log(`Total: ${rows.length}`);

  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) {
    console.log('\n--dry-run: nada foi escrito no Supabase.');
    return;
  }

  const supabase = getSupabaseClient();

  const { error: deleteError } = await supabase
    .from('moradas')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (deleteError) {
    throw new Error(`Falha ao limpar tabela moradas: ${deleteError.message}`);
  }

  const chunkSize = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from('moradas').insert(chunk);
    if (error) {
      throw new Error(`Falha ao inserir linhas ${i}-${i + chunk.length}: ${error.message}`);
    }
    inserted += chunk.length;
  }
  console.log(`\nInseridas ${inserted} linhas no Supabase.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
