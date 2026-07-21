# Recolhas CTT — Circuitos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js + Supabase web app that replaces `codigos_postais_ruas.xlsx` with a searchable, editable database of moradas (ruas/freguesias/clientes) mapped to circuitos, deployed free on Vercel.

**Architecture:** Next.js 14 App Router (TypeScript) with API routes that talk to a Supabase Postgres table (`moradas`) using the service-role key server-side only. A public search page (`/`) reads via `/api/moradas`. An admin area (`/admin`) protected by a single shared password (HMAC session cookie checked in `middleware.ts`) allows create/edit/delete and re-import of the Excel file.

**Tech Stack:** Next.js 14 (App Router, TypeScript), Supabase (`@supabase/supabase-js`), `xlsx` (SheetJS) for Excel parsing, Vitest for unit tests, deployed via `vercel` CLI.

## Global Constraints

- All Supabase access happens server-side only (API routes / scripts) using the **service role key**. Never expose Supabase keys to the browser (no `NEXT_PUBLIC_` prefix on secrets).
- `circuito` normalization rule (from spec): if `codigo_bruto` trimmed matches a single letter (`^[A-Za-zÀ-ÿ]$`), the final circuito is `zona + codigoBruto.toUpperCase()`. Otherwise (empty, multi-character, or already-complete codes like `OPE07`/`EV922`/`4100A`/`RSBS1`, or messy values like `?`/`N/H`), the circuito is `codigo_bruto` trimmed as-is, or `''` if empty.
- Search must be case- and accent-insensitive (e.g. "fundacao" matches "Fundação").
- Admin routes (`/admin/*` pages, and mutating API routes `POST/PUT/DELETE`) require a valid session cookie; the public search page and `GET /api/moradas` never require auth.
- No user accounts — a single password stored in `ADMIN_PASSWORD` env var.
- Source Excel file lives at repo root: `codigos_postais_ruas.xlsx` (already committed).

---

## File Structure

```
package.json, tsconfig.json, next.config.mjs, vitest.config.ts, .env.local.example, .gitignore
lib/
  normalize.ts        - normalizeCircuito(zona, codigoBruto)
  normalize.test.ts
  search.ts           - normalizeSearchText(text), filterMoradas(rows, query, zona)
  search.test.ts
  importExcel.ts       - parseWorkbookToRows(workbook): MoradaInput[]
  importExcel.test.ts
  supabase.ts          - getSupabaseClient() using service role key
  auth.ts              - createSessionToken(), verifySessionToken(token), isCorrectPassword(pw)
  auth.test.ts
  types.ts             - Morada, MoradaInput types
app/
  page.tsx             - public search page
  admin/
    login/page.tsx     - password form
    page.tsx           - admin listing + create/edit/delete/reimport UI
  api/
    moradas/route.ts        - GET (list/search), POST (create, protected)
    moradas/[id]/route.ts   - PUT (edit, protected), DELETE (protected)
    admin/login/route.ts    - POST verifies password, sets cookie
    admin/logout/route.ts   - POST clears cookie
    import/route.ts         - POST upload xlsx, replace all rows (protected)
middleware.ts           - protects /admin pages + mutating API routes
supabase/schema.sql      - moradas table DDL
scripts/migrate.ts       - one-off CLI: import codigos_postais_ruas.xlsx into Supabase
```

---

### Task 1: Project scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.mjs`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `.env.local.example`
- Create: `lib/types.ts`
- Create: `lib/sanity.test.ts`

**Interfaces:**
- Produces: `Morada` and `MoradaInput` types used by every later task.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "recolhas-ctt-circuitos",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "migrate": "tsx scripts/migrate.ts"
  },
  "dependencies": {
    "next": "14.2.16",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "@supabase/supabase-js": "2.45.4",
    "xlsx": "0.18.5"
  },
  "devDependencies": {
    "typescript": "5.6.3",
    "@types/node": "20.16.11",
    "@types/react": "18.3.11",
    "@types/react-dom": "18.3.1",
    "vitest": "2.1.3",
    "tsx": "4.19.1"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`
Expected: `node_modules` created, `package-lock.json` created, no errors.

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create `next.config.mjs`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
```

- [ ] **Step 5: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
```

- [ ] **Step 6: Create `.gitignore`**

```
node_modules/
.next/
.env.local
*.log
```

- [ ] **Step 7: Create `.env.local.example`**

```
# Supabase (Project Settings > API no dashboard do Supabase)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxxx

# Password única para entrar em /admin
ADMIN_PASSWORD=escolhe-uma-password
# Segredo usado para assinar o cookie de sessão do admin (qualquer string longa aleatória)
SESSION_SECRET=xxxxx
```

- [ ] **Step 8: Create `lib/types.ts`**

```ts
export interface Morada {
  id: string;
  zona: string;
  categoria: string;
  nome: string;
  codigo_bruto: string;
  circuito: string;
  criado_em: string;
  atualizado_em: string;
}

export interface MoradaInput {
  zona: string;
  categoria: string;
  nome: string;
  codigo_bruto: string;
  circuito: string;
}
```

- [ ] **Step 9: Write a sanity test to confirm the test runner works**

Create `lib/sanity.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('sanity', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 10: Run the test suite**

Run: `npm test`
Expected: 1 test file, 1 test passed.

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.mjs vitest.config.ts .gitignore .env.local.example lib/types.ts lib/sanity.test.ts
git commit -m "chore: scaffold Next.js + TypeScript + Vitest project"
```

---

### Task 2: `normalizeCircuito`

**Files:**
- Create: `lib/normalize.ts`
- Test: `lib/normalize.test.ts`

**Interfaces:**
- Consumes: nothing (pure function, no dependencies).
- Produces: `normalizeCircuito(zona: string, codigoBruto: string | null | undefined): string` — used by `lib/importExcel.ts` (Task 4) and by the create/edit API routes (Tasks 8-9).

- [ ] **Step 1: Write the failing tests**

Create `lib/normalize.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { normalizeCircuito } from './normalize';

describe('normalizeCircuito', () => {
  it('returns empty string when codigoBruto is empty/null/undefined', () => {
    expect(normalizeCircuito('4100', '')).toBe('');
    expect(normalizeCircuito('4100', null)).toBe('');
    expect(normalizeCircuito('4100', undefined)).toBe('');
    expect(normalizeCircuito('4100', '   ')).toBe('');
  });

  it('prepends zona when codigoBruto is a single letter', () => {
    expect(normalizeCircuito('4100', 'A')).toBe('4100A');
    expect(normalizeCircuito('4100', 'a')).toBe('4100A');
    expect(normalizeCircuito('4200', 'z')).toBe('4200Z');
  });

  it('keeps already-complete codes as-is', () => {
    expect(normalizeCircuito('4480', 'OPE07')).toBe('OPE07');
    expect(normalizeCircuito('4605-4630 Rural', 'EV922')).toBe('EV922');
    expect(normalizeCircuito('4100', '4100A')).toBe('4100A');
    expect(normalizeCircuito('4100', 'RSBS1')).toBe('RSBS1');
  });

  it('keeps messy values as-is', () => {
    expect(normalizeCircuito('4200', '?')).toBe('?');
    expect(normalizeCircuito('4490', 'N/H')).toBe('N/H');
    expect(normalizeCircuito('4000 (parte 1)', 'B / E (Bragrito)')).toBe('B / E (Bragrito)');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeCircuito('4100', '  A  ')).toBe('4100A');
    expect(normalizeCircuito('4480', '  OPE07  ')).toBe('OPE07');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- normalize`
Expected: FAIL — `Cannot find module './normalize'`.

- [ ] **Step 3: Write the implementation**

Create `lib/normalize.ts`:

```ts
const SINGLE_LETTER = /^[A-Za-zÀ-ÿ]$/;

export function normalizeCircuito(
  zona: string,
  codigoBruto: string | null | undefined
): string {
  if (!codigoBruto) return '';
  const trimmed = codigoBruto.trim();
  if (!trimmed) return '';
  if (SINGLE_LETTER.test(trimmed)) {
    return `${zona}${trimmed.toUpperCase()}`;
  }
  return trimmed;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- normalize`
Expected: 5 tests passed.

- [ ] **Step 5: Commit**

```bash
git add lib/normalize.ts lib/normalize.test.ts
git commit -m "feat: add normalizeCircuito"
```

---

### Task 3: Accent-insensitive search helpers

**Files:**
- Create: `lib/search.ts`
- Test: `lib/search.test.ts`

**Interfaces:**
- Consumes: `Morada` type from `lib/types.ts` (Task 1).
- Produces: `normalizeSearchText(text: string): string` and `filterMoradas(rows: Morada[], query: string, zona?: string): Morada[]` — used by `app/api/moradas/route.ts` (Task 8).

- [ ] **Step 1: Write the failing tests**

Create `lib/search.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { normalizeSearchText, filterMoradas } from './search';
import type { Morada } from './types';

describe('normalizeSearchText', () => {
  it('lowercases and strips accents', () => {
    expect(normalizeSearchText('Fundação')).toBe('fundacao');
    expect(normalizeSearchText('AÇUCAREIRA')).toBe('acucareira');
    expect(normalizeSearchText('  Água Férreas  ')).toBe('agua ferreas');
  });
});

function makeMorada(overrides: Partial<Morada>): Morada {
  return {
    id: '1',
    zona: '4100',
    categoria: 'Rua',
    nome: 'FUNDAÇÃO',
    codigo_bruto: 'A',
    circuito: '4100A',
    criado_em: '2026-01-01',
    atualizado_em: '2026-01-01',
    ...overrides,
  };
}

describe('filterMoradas', () => {
  const rows: Morada[] = [
    makeMorada({ id: '1', nome: 'FUNDAÇÃO', zona: '4100', circuito: '4100A' }),
    makeMorada({ id: '2', nome: 'BOAVISTA', zona: '4100', categoria: 'Avenida', circuito: '4100D' }),
    makeMorada({ id: '3', nome: 'BOAVISTA', zona: '4200', categoria: 'Avenida', circuito: '4200C' }),
    makeMorada({ id: '4', nome: 'CUSTOIAS', zona: '4450-4460', categoria: 'Freguesia', circuito: '4450-4460R' }),
  ];

  it('matches by nome, accent- and case-insensitive', () => {
    const result = filterMoradas(rows, 'fundacao');
    expect(result.map((r) => r.id)).toEqual(['1']);
  });

  it('matches partial text', () => {
    const result = filterMoradas(rows, 'boavist');
    expect(result.map((r) => r.id).sort()).toEqual(['2', '3']);
  });

  it('filters by zona when provided', () => {
    const result = filterMoradas(rows, 'boavista', '4200');
    expect(result.map((r) => r.id)).toEqual(['3']);
  });

  it('matches by circuito text too', () => {
    const result = filterMoradas(rows, '4100a');
    expect(result.map((r) => r.id)).toEqual(['1']);
  });

  it('returns all rows when query is empty', () => {
    expect(filterMoradas(rows, '')).toHaveLength(4);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- search`
Expected: FAIL — `Cannot find module './search'`.

- [ ] **Step 3: Write the implementation**

Create `lib/search.ts`:

```ts
import type { Morada } from './types';

export function normalizeSearchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function filterMoradas(
  rows: Morada[],
  query: string,
  zona?: string
): Morada[] {
  const normalizedQuery = normalizeSearchText(query);
  return rows.filter((row) => {
    if (zona && row.zona !== zona) return false;
    if (!normalizedQuery) return true;
    const haystack = normalizeSearchText(
      `${row.nome} ${row.categoria} ${row.circuito}`
    );
    return haystack.includes(normalizedQuery);
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- search`
Expected: 6 tests passed.

- [ ] **Step 5: Commit**

```bash
git add lib/search.ts lib/search.test.ts
git commit -m "feat: add accent-insensitive search helpers"
```

---

### Task 4: Excel parsing

**Files:**
- Create: `lib/importExcel.ts`
- Test: `lib/importExcel.test.ts`

**Interfaces:**
- Consumes: `normalizeCircuito` from `lib/normalize.ts` (Task 2), `MoradaInput` from `lib/types.ts` (Task 1), `XLSX.WorkBook` type from `xlsx`.
- Produces: `parseWorkbookToRows(workbook: XLSX.WorkBook): MoradaInput[]` — used by `scripts/migrate.ts` (Task 5) and `app/api/import/route.ts` (Task 11).

- [ ] **Step 1: Write the failing tests**

Create `lib/importExcel.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseWorkbookToRows } from './importExcel';

function buildWorkbook(sheets: Record<string, (string | null)[][]>): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  for (const [sheetName, rows] of Object.entries(sheets)) {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }
  return wb;
}

describe('parseWorkbookToRows', () => {
  it('skips the header row and maps columns per sheet', () => {
    const wb = buildWorkbook({
      '4100': [
        ['Categoria', 'Nome', 'Codigo'],
        ['Rua', 'BESSA', 'A'],
        ['Avenida', 'BOAVISTA', 'D'],
      ],
    });

    const rows = parseWorkbookToRows(wb);

    expect(rows).toEqual([
      {
        zona: '4100',
        categoria: 'Rua',
        nome: 'BESSA',
        codigo_bruto: 'A',
        circuito: '4100A',
      },
      {
        zona: '4100',
        categoria: 'Avenida',
        nome: 'BOAVISTA',
        codigo_bruto: 'D',
        circuito: '4100D',
      },
    ]);
  });

  it('reads every sheet, using the sheet name as zona', () => {
    const wb = buildWorkbook({
      '4100': [
        ['Categoria', 'Nome', 'Codigo'],
        ['Rua', 'BESSA', 'A'],
      ],
      '4200': [
        ['Categoria', 'Nome', 'Codigo'],
        ['Avenida', 'FRANÇA', 'A'],
      ],
    });

    const rows = parseWorkbookToRows(wb);

    expect(rows.map((r) => r.zona)).toEqual(['4100', '4200']);
  });

  it('handles a missing/empty Codigo cell as empty codigo_bruto and empty circuito', () => {
    const wb = buildWorkbook({
      '4100': [
        ['Categoria', 'Nome', 'Codigo'],
        ['Nota', 'CACIFO DIOGO BOTELHO - 4100G', null],
      ],
    });

    const rows = parseWorkbookToRows(wb);

    expect(rows).toEqual([
      {
        zona: '4100',
        categoria: 'Nota',
        nome: 'CACIFO DIOGO BOTELHO - 4100G',
        codigo_bruto: '',
        circuito: '',
      },
    ]);
  });

  it('keeps already-complete codes as-is via normalizeCircuito', () => {
    const wb = buildWorkbook({
      '4480': [
        ['Categoria', 'Nome', 'Codigo'],
        ['Cliente', 'BLUME FOR HOME-R BACELO', 'OPE07'],
      ],
    });

    const rows = parseWorkbookToRows(wb);

    expect(rows[0].circuito).toBe('OPE07');
  });

  it('skips fully blank rows', () => {
    const wb = buildWorkbook({
      '4100': [
        ['Categoria', 'Nome', 'Codigo'],
        ['Rua', 'BESSA', 'A'],
        [null, null, null],
      ],
    });

    const rows = parseWorkbookToRows(wb);

    expect(rows).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- importExcel`
Expected: FAIL — `Cannot find module './importExcel'`.

- [ ] **Step 3: Write the implementation**

Create `lib/importExcel.ts`:

```ts
import * as XLSX from 'xlsx';
import { normalizeCircuito } from './normalize';
import type { MoradaInput } from './types';

export function parseWorkbookToRows(workbook: XLSX.WorkBook): MoradaInput[] {
  const rows: MoradaInput[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json<(string | null)[]>(sheet, {
      header: 1,
      defval: null,
    });

    // Skip header row (first row: Categoria, Nome, Codigo)
    for (const row of raw.slice(1)) {
      const [categoria, nome, codigo] = row;
      if (!categoria && !nome && !codigo) continue;

      const categoriaStr = categoria ? String(categoria).trim() : '';
      const nomeStr = nome ? String(nome).trim() : '';
      const codigoBrutoStr = codigo ? String(codigo).trim() : '';

      if (!categoriaStr && !nomeStr) continue;

      rows.push({
        zona: sheetName,
        categoria: categoriaStr,
        nome: nomeStr,
        codigo_bruto: codigoBrutoStr,
        circuito: normalizeCircuito(sheetName, codigoBrutoStr),
      });
    }
  }

  return rows;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- importExcel`
Expected: 5 tests passed.

- [ ] **Step 5: Commit**

```bash
git add lib/importExcel.ts lib/importExcel.test.ts
git commit -m "feat: add Excel workbook parser"
```

---

### Task 5: Supabase schema + client

**Files:**
- Create: `supabase/schema.sql`
- Create: `lib/supabase.ts`

**Interfaces:**
- Produces: `getSupabaseClient(): SupabaseClient` — used by `scripts/migrate.ts` (Task 6) and all API routes (Tasks 8-11).

**This task requires manual action in the Supabase dashboard — there is no automated test.**

- [ ] **Step 1: Create `supabase/schema.sql`**

```sql
create table if not exists moradas (
  id uuid primary key default gen_random_uuid(),
  zona text not null,
  categoria text not null default '',
  nome text not null default '',
  codigo_bruto text not null default '',
  circuito text not null default '',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists moradas_zona_idx on moradas (zona);
create index if not exists moradas_circuito_idx on moradas (circuito);
```

- [ ] **Step 2: Apply the schema in Supabase (manual, done by the user)**

Instructions for the user (Claude cannot access the Supabase dashboard):
1. Open your Supabase project → SQL Editor.
2. Paste the contents of `supabase/schema.sql` and run it.
3. Confirm table `moradas` now appears under Table Editor.

- [ ] **Step 3: Create `lib/supabase.ts`**

```ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment'
    );
  }

  client = createClient(url, key, {
    auth: { persistSession: false },
  });
  return client;
}
```

- [ ] **Step 4: Get user's Supabase credentials (manual)**

Ask the user to create `.env.local` (not committed, already gitignored) at the repo root by copying `.env.local.example`, filling in:
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from Supabase dashboard → Project Settings → API.
- Leave `ADMIN_PASSWORD` and `SESSION_SECRET` for Task 7.

Do not ask the user to paste these values into chat — have them edit the file directly.

- [ ] **Step 5: Commit**

```bash
git add supabase/schema.sql lib/supabase.ts
git commit -m "feat: add Supabase schema and client factory"
```

---

### Task 6: Migration script

**Files:**
- Create: `scripts/migrate.ts`

**Interfaces:**
- Consumes: `parseWorkbookToRows` (Task 4), `getSupabaseClient` (Task 5), `MoradaInput` (Task 1).

**This task's deliverable is verified by actually running it against the user's Supabase project, not by a unit test (it is an integration/side-effecting script).**

- [ ] **Step 1: Create `scripts/migrate.ts`**

```ts
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
```

- [ ] **Step 2: Dry run to verify parsing counts before touching the database**

Run: `npx tsx scripts/migrate.ts --dry-run`
Expected: prints a per-sheet row count and a total; compare each count by eye against the row count of each sheet in `codigos_postais_ruas.xlsx` (open the file and check, e.g., sheet `4100` has 435 total rows including header and blank rows — the printed count should be at or slightly below 434 once truly-blank rows are excluded).

- [ ] **Step 3: Real run against Supabase (only after `.env.local` is filled in from Task 5)**

Run: `npx tsx --env-file=.env.local scripts/migrate.ts`
Expected: prints the same per-sheet counts, then "Inseridas N linhas no Supabase." Confirm in the Supabase Table Editor that `moradas` now has N rows.

- [ ] **Step 4: Commit**

```bash
git add scripts/migrate.ts
git commit -m "feat: add one-off Excel-to-Supabase migration script"
```

---

### Task 7: Admin auth helpers

**Files:**
- Create: `lib/auth.ts`
- Test: `lib/auth.test.ts`

**Interfaces:**
- Consumes: `ADMIN_PASSWORD` and `SESSION_SECRET` env vars.
- Produces: `isCorrectPassword(password: string): boolean`, `createSessionToken(): string`, `verifySessionToken(token: string | undefined | null): boolean`, `SESSION_COOKIE_NAME: string` — used by `app/api/admin/login/route.ts` (Task 10), `middleware.ts` (Task 12).

- [ ] **Step 1: Write the failing tests**

Create `lib/auth.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- auth`
Expected: FAIL — `Cannot find module './auth'`.

- [ ] **Step 3: Write the implementation**

Create `lib/auth.ts`:

```ts
import { createHmac, timingSafeEqual } from 'crypto';

export const SESSION_COOKIE_NAME = 'recolhas_admin_session';

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET must be set in the environment');
  }
  return secret;
}

export function isCorrectPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    throw new Error('ADMIN_PASSWORD must be set in the environment');
  }
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function createSessionToken(): string {
  return createHmac('sha256', getSessionSecret()).update('admin-session').digest('hex');
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const expected = createSessionToken();
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- auth`
Expected: 3 tests passed.

- [ ] **Step 5: Fill in `ADMIN_PASSWORD` and `SESSION_SECRET` in `.env.local` (manual)**

Tell the user to pick a password and set both `ADMIN_PASSWORD` and a long random `SESSION_SECRET` string in their local `.env.local` (already created in Task 5).

- [ ] **Step 6: Commit**

```bash
git add lib/auth.ts lib/auth.test.ts
git commit -m "feat: add admin password/session token helpers"
```

---

### Task 8: `GET /api/moradas` (public list/search) and `POST /api/moradas` (protected create)

**Files:**
- Create: `app/api/moradas/route.ts`
- Test: `app/api/moradas/route.test.ts`

**Interfaces:**
- Consumes: `getSupabaseClient` (Task 5), `filterMoradas` (Task 3), `normalizeCircuito` (Task 2), `Morada`/`MoradaInput` (Task 1), `SESSION_COOKIE_NAME`/`verifySessionToken` (Task 7).
- Produces: HTTP `GET /api/moradas?q=&zona=` → `{ moradas: Morada[] }`; `POST /api/moradas` body `{ zona, categoria, nome, codigo_bruto }` → `{ morada: Morada }` (201) or `{ error }` (401 if not authenticated).

- [ ] **Step 1: Write the failing tests**

Create `app/api/moradas/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const selectMock = vi.fn();
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
  selectMock.mockResolvedValue({ data: sampleRows, error: null });
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- app/api/moradas/route`
Expected: FAIL — `Cannot find module './route'`.

- [ ] **Step 3: Write the implementation**

Create `app/api/moradas/route.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- app/api/moradas/route`
Expected: 4 tests passed.

- [ ] **Step 5: Commit**

```bash
git add app/api/moradas/route.ts app/api/moradas/route.test.ts
git commit -m "feat: add GET/POST /api/moradas"
```

---

### Task 9: `PUT`/`DELETE /api/moradas/[id]` (protected edit/delete)

**Files:**
- Create: `app/api/moradas/[id]/route.ts`
- Test: `app/api/moradas/[id]/route.test.ts`

**Interfaces:**
- Consumes: same helpers as Task 8, plus dynamic route `params.id`.
- Produces: `PUT /api/moradas/:id` body `{ zona, categoria, nome, codigo_bruto }` → `{ morada: Morada }`; `DELETE /api/moradas/:id` → `{ ok: true }`. Both 401 when not authenticated.

- [ ] **Step 1: Write the failing tests**

Create `app/api/moradas/[id]/route.test.ts`:

```ts
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
    const response = await PUT(request, { params: { id: '1' } });
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
    const response = await PUT(request, { params: { id: '1' } });
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
    const response = await DELETE(request, { params: { id: '1' } });
    expect(response.status).toBe(401);
  });

  it('deletes when authenticated', async () => {
    deleteEqMock.mockResolvedValue({ error: null });

    const { DELETE } = await import('./route');
    const request = new Request('http://localhost/api/moradas/1', {
      method: 'DELETE',
      headers: { Cookie: await authCookieHeader() },
    });
    const response = await DELETE(request, { params: { id: '1' } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(deleteEqMock).toHaveBeenCalledWith('id', '1');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- "app/api/moradas/\[id\]/route"`
Expected: FAIL — `Cannot find module './route'`.

- [ ] **Step 3: Write the implementation**

Create `app/api/moradas/[id]/route.ts`:

```ts
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
  { params }: { params: { id: string } }
) {
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
    .update({
      zona,
      categoria: categoria ?? '',
      nome,
      codigo_bruto: codigo_bruto ?? '',
      circuito,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ morada: data });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated(request)) {
    return Response.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.from('moradas').delete().eq('id', params.id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- "app/api/moradas/\[id\]/route"`
Expected: 4 tests passed.

- [ ] **Step 5: Commit**

```bash
git add "app/api/moradas/[id]/route.ts" "app/api/moradas/[id]/route.test.ts"
git commit -m "feat: add PUT/DELETE /api/moradas/[id]"
```

---

### Task 10: Admin login/logout API routes

**Files:**
- Create: `app/api/admin/login/route.ts`
- Create: `app/api/admin/logout/route.ts`
- Test: `app/api/admin/login/route.test.ts`

**Interfaces:**
- Consumes: `isCorrectPassword`, `createSessionToken`, `SESSION_COOKIE_NAME` (Task 7).
- Produces: `POST /api/admin/login` body `{ password }` → sets cookie, `{ ok: true }` (200) or `{ error }` (401). `POST /api/admin/logout` → clears cookie, `{ ok: true }`.

- [ ] **Step 1: Write the failing tests**

Create `app/api/admin/login/route.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- app/api/admin/login/route`
Expected: FAIL — `Cannot find module './route'`.

- [ ] **Step 3: Write the implementation**

Create `app/api/admin/login/route.ts`:

```ts
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
```

Create `app/api/admin/logout/route.ts`:

```ts
import { SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST() {
  const response = Response.json({ ok: true });
  response.headers.set(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
  return response;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- app/api/admin/login/route`
Expected: 2 tests passed.

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/login/route.ts app/api/admin/logout/route.ts app/api/admin/login/route.test.ts
git commit -m "feat: add admin login/logout API routes"
```

---

### Task 11: Re-import API route

**Files:**
- Create: `app/api/import/route.ts`
- Test: `app/api/import/route.test.ts`

**Interfaces:**
- Consumes: `parseWorkbookToRows` (Task 4), `getSupabaseClient` (Task 5), auth helpers (Task 7).
- Produces: `POST /api/import` with `multipart/form-data` field `file` (the `.xlsx`) → replaces all rows, `{ ok: true, count: number }` (200) or `{ error }` (401/400/500).

- [ ] **Step 1: Write the failing tests**

Create `app/api/import/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as XLSX from 'xlsx';

const neqMock = vi.fn();
const deleteMock = vi.fn(() => ({ neq: neqMock }));
const insertMock = vi.fn();
const fromMock = vi.fn(() => ({ delete: deleteMock, insert: insertMock }));

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({ from: fromMock }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SESSION_SECRET = 'chave-de-teste-bem-comprida';
  neqMock.mockResolvedValue({ error: null });
  insertMock.mockResolvedValue({ error: null });
});

async function authCookieHeader() {
  const { createSessionToken, SESSION_COOKIE_NAME } = await import('@/lib/auth');
  return `${SESSION_COOKIE_NAME}=${createSessionToken()}`;
}

function buildXlsxFile(): File {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Categoria', 'Nome', 'Codigo'],
    ['Rua', 'BESSA', 'A'],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, '4100');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new File([buffer], 'update.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

describe('POST /api/import', () => {
  it('rejects when not authenticated', async () => {
    const { POST } = await import('./route');
    const formData = new FormData();
    formData.set('file', buildXlsxFile());
    const request = new Request('http://localhost/api/import', {
      method: 'POST',
      body: formData,
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('replaces all rows when authenticated', async () => {
    const formData = new FormData();
    formData.set('file', buildXlsxFile());
    const request = new Request('http://localhost/api/import', {
      method: 'POST',
      body: formData,
      headers: { Cookie: await authCookieHeader() },
    });

    const { POST } = await import('./route');
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.count).toBe(1);
    expect(deleteMock).toHaveBeenCalled();
    expect(insertMock).toHaveBeenCalledWith([
      expect.objectContaining({ zona: '4100', nome: 'BESSA', circuito: '4100A' }),
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- app/api/import/route`
Expected: FAIL — `Cannot find module './route'`.

- [ ] **Step 3: Write the implementation**

Create `app/api/import/route.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- app/api/import/route`
Expected: 2 tests passed.

- [ ] **Step 5: Commit**

```bash
git add app/api/import/route.ts app/api/import/route.test.ts
git commit -m "feat: add re-import API route"
```

---

### Task 12: Middleware protecting `/admin` pages

**Files:**
- Create: `middleware.ts`

**Interfaces:**
- Consumes: `verifySessionToken`, `SESSION_COOKIE_NAME` (Task 7).

**Middleware is Next.js wiring around already-tested `lib/auth.ts` logic — verified manually via the browser in Task 14, not with a unit test.**

- [ ] **Step 1: Create `middleware.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

export function middleware(request: NextRequest) {
  const isLoginPage = request.nextUrl.pathname === '/admin/login';
  if (isLoginPage) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!verifySessionToken(token)) {
    const loginUrl = new URL('/admin/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
```

- [ ] **Step 2: Commit**

```bash
git add middleware.ts
git commit -m "feat: protect /admin pages with session middleware"
```

---

### Task 13: Public search page

**Files:**
- Create: `app/page.tsx`
- Create: `app/layout.tsx`
- Create: `app/globals.css`

**Interfaces:**
- Consumes: `GET /api/moradas?q=&zona=` (Task 8).

**This is a UI task. There is no automated test — verify manually in the browser per Step 4 (per the project's UI-testing convention: type-check and unit tests don't confirm feature correctness for UI).**

- [ ] **Step 1: Create `app/layout.tsx`**

```tsx
import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Recolhas CTT — Circuitos',
  description: 'Pesquisa de circuitos por rua, freguesia ou cliente',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Create `app/globals.css`**

```css
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: system-ui, -apple-system, sans-serif;
  background: #f5f5f5;
  color: #1a1a1a;
}

.container {
  max-width: 640px;
  margin: 0 auto;
  padding: 16px;
}

input, select, button {
  font-size: 16px;
}

.search-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ccc;
  border-radius: 8px;
  margin-bottom: 8px;
}

.zona-select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 8px;
  margin-bottom: 16px;
}

.card {
  background: white;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.card .circuito {
  font-size: 1.4em;
  font-weight: bold;
  color: #0a5c36;
}

.card .meta {
  color: #666;
  font-size: 0.9em;
}

.admin-link {
  display: block;
  text-align: center;
  margin-top: 24px;
  color: #666;
  font-size: 0.85em;
}
```

- [ ] **Step 3: Create `app/page.tsx`**

```tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import type { Morada } from '@/lib/types';

export default function SearchPage() {
  const [all, setAll] = useState<Morada[]>([]);
  const [query, setQuery] = useState('');
  const [zona, setZona] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/moradas')
      .then((res) => res.json())
      .then((data) => setAll(data.moradas ?? []))
      .finally(() => setLoading(false));
  }, []);

  const zonas = useMemo(
    () => Array.from(new Set(all.map((m) => m.zona))).sort(),
    [all]
  );

  const results = useMemo(() => {
    const normalizedQuery = query
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim();
    return all.filter((m) => {
      if (zona && m.zona !== zona) return false;
      if (!normalizedQuery) return true;
      const haystack = `${m.nome} ${m.categoria} ${m.circuito}`
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [all, query, zona]);

  return (
    <div className="container">
      <h1>Recolhas CTT — Circuitos</h1>
      <input
        className="search-input"
        placeholder="Pesquisar rua, freguesia ou cliente..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <select
        className="zona-select"
        value={zona}
        onChange={(e) => setZona(e.target.value)}
      >
        <option value="">Todas as zonas</option>
        {zonas.map((z) => (
          <option key={z} value={z}>
            {z}
          </option>
        ))}
      </select>

      {loading && <p>A carregar...</p>}
      {!loading && results.length === 0 && <p>Sem resultados.</p>}
      {results.slice(0, 200).map((m) => (
        <div className="card" key={m.id}>
          <div className="circuito">{m.circuito || '(sem circuito)'}</div>
          <div className="meta">
            {m.categoria} · {m.nome} · zona {m.zona}
          </div>
        </div>
      ))}

      <a className="admin-link" href="/admin">
        Administração
      </a>
    </div>
  );
}
```

- [ ] **Step 4: Manual browser verification**

Run: `npm run dev` (with `.env.local` filled in and Supabase populated from Task 6), open `http://localhost:3000`.
Expected: page loads, typing a known street name (e.g. "bessa") shows a card with categoria "Rua/Avenida", the right zona, and the right circuito; typing with/without accents gives the same results; the zona dropdown filters results.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx app/layout.tsx app/globals.css
git commit -m "feat: add public search page"
```

---

### Task 14: Admin login page

**Files:**
- Create: `app/admin/login/page.tsx`

**Interfaces:**
- Consumes: `POST /api/admin/login` (Task 10).

- [ ] **Step 1: Create `app/admin/login/page.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      router.push('/admin');
    } else {
      setError('Password incorreta.');
    }
  }

  return (
    <div className="container">
      <h1>Administração</h1>
      <form onSubmit={handleSubmit}>
        <input
          className="search-input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit">Entrar</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Manual browser verification**

Run: `npm run dev`, open `http://localhost:3000/admin` (should redirect to `/admin/login` per middleware). Enter the wrong password → error shown. Enter the correct `ADMIN_PASSWORD` from `.env.local` → redirected to `/admin`.

- [ ] **Step 3: Commit**

```bash
git add app/admin/login/page.tsx
git commit -m "feat: add admin login page"
```

---

### Task 15: Admin listing + create/edit/delete/reimport UI

**Files:**
- Create: `app/admin/page.tsx`

**Interfaces:**
- Consumes: `GET/POST /api/moradas` (Task 8), `PUT/DELETE /api/moradas/[id]` (Task 9), `POST /api/import` (Task 11), `POST /api/admin/logout` (Task 10).

- [ ] **Step 1: Create `app/admin/page.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Morada } from '@/lib/types';

const emptyForm = { zona: '', categoria: '', nome: '', codigo_bruto: '' };

export default function AdminPage() {
  const [moradas, setMoradas] = useState<Morada[]>([]);
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState('');
  const router = useRouter();

  async function reload() {
    const res = await fetch('/api/moradas');
    const data = await res.json();
    setMoradas(data.moradas ?? []);
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = editingId ? `/api/moradas/${editingId}` : '/api/moradas';
    const method = editingId ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      body: JSON.stringify(form),
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      setForm(emptyForm);
      setEditingId(null);
      reload();
    }
  }

  function startEdit(m: Morada) {
    setEditingId(m.id);
    setForm({
      zona: m.zona,
      categoria: m.categoria,
      nome: m.nome,
      codigo_bruto: m.codigo_bruto,
    });
  }

  async function handleDelete(id: string) {
    if (!confirm('Apagar esta entrada?')) return;
    await fetch(`/api/moradas/${id}`, { method: 'DELETE' });
    reload();
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!importFile) return;
    if (
      !confirm(
        'Isto substitui TODOS os dados atuais pelo conteúdo deste ficheiro Excel. Continuar?'
      )
    ) {
      return;
    }
    setImportStatus('A importar...');
    const formData = new FormData();
    formData.set('file', importFile);
    const res = await fetch('/api/import', { method: 'POST', body: formData });
    const data = await res.json();
    if (res.ok) {
      setImportStatus(`Importadas ${data.count} linhas.`);
      reload();
    } else {
      setImportStatus(`Erro: ${data.error}`);
    }
  }

  const visible = moradas.filter((m) =>
    `${m.zona} ${m.categoria} ${m.nome} ${m.circuito}`
      .toLowerCase()
      .includes(filter.toLowerCase())
  );

  return (
    <div className="container">
      <h1>Administração</h1>
      <button onClick={handleLogout}>Sair</button>

      <h2>{editingId ? 'Editar entrada' : 'Nova entrada'}</h2>
      <form onSubmit={handleSubmit}>
        <input
          className="search-input"
          placeholder="Zona (ex: 4100)"
          value={form.zona}
          onChange={(e) => setForm({ ...form, zona: e.target.value })}
        />
        <input
          className="search-input"
          placeholder="Categoria (ex: Rua)"
          value={form.categoria}
          onChange={(e) => setForm({ ...form, categoria: e.target.value })}
        />
        <input
          className="search-input"
          placeholder="Nome"
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
        />
        <input
          className="search-input"
          placeholder="Código (ex: A ou OPE07)"
          value={form.codigo_bruto}
          onChange={(e) => setForm({ ...form, codigo_bruto: e.target.value })}
        />
        <button type="submit">{editingId ? 'Guardar' : 'Adicionar'}</button>
        {editingId && (
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setForm(emptyForm);
            }}
          >
            Cancelar
          </button>
        )}
      </form>

      <h2>Reimportar Excel</h2>
      <form onSubmit={handleImport}>
        <input
          type="file"
          accept=".xlsx"
          onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
        />
        <button type="submit">Reimportar (substitui tudo)</button>
        {importStatus && <p>{importStatus}</p>}
      </form>

      <h2>Todas as entradas ({visible.length})</h2>
      <input
        className="search-input"
        placeholder="Filtrar..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      {visible.slice(0, 200).map((m) => (
        <div className="card" key={m.id}>
          <div className="circuito">{m.circuito || '(sem circuito)'}</div>
          <div className="meta">
            {m.categoria} · {m.nome} · zona {m.zona}
          </div>
          <button onClick={() => startEdit(m)}>Editar</button>
          <button onClick={() => handleDelete(m.id)}>Apagar</button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Manual browser verification**

Run: `npm run dev`, log in at `/admin/login`, then on `/admin`:
1. Add a test entry (zona `9999`, categoria `Rua`, nome `TESTE`, código `A`) → confirm it appears with circuito `9999A`.
2. Edit it (change código to `B`) → confirm circuito updates to `9999B`.
3. Delete it → confirm it disappears from the list.
4. Confirm the new/edited/deleted entries also reflect correctly on the public `/` search page.
Expected: all four behaviors work as described.

- [ ] **Step 3: Commit**

```bash
git add app/admin/page.tsx
git commit -m "feat: add admin listing with create/edit/delete/reimport"
```

---

### Task 16: Deploy to Vercel

**Files:** none (deployment/configuration only)

**This task involves pushing the app to a public URL — confirm with the user before running deploy commands, per the project's safety guidelines around actions affecting shared/external systems.**

- [ ] **Step 1: Log in to Vercel CLI (if not already logged in)**

Run: `npx vercel login`
Expected: browser opens, user authorizes, CLI prints "Success!".

- [ ] **Step 2: Link the project**

Run: `npx vercel link`
Expected: prompts to select/create a Vercel project; creates `.vercel/` locally (already covered by `.gitignore`? — add it if not).

- [ ] **Step 3: Add `.vercel` to `.gitignore` if missing**

Check `.gitignore` contains `.vercel`; if not, append it.

- [ ] **Step 4: Set production environment variables**

Run each of (values filled in by the user from their `.env.local`, not typed into chat):
```bash
npx vercel env add SUPABASE_URL production
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
npx vercel env add ADMIN_PASSWORD production
npx vercel env add SESSION_SECRET production
```
Expected: each prompts for the value interactively and confirms it was added.

- [ ] **Step 5: Deploy to production**

Run: `npx vercel --prod`
Expected: build succeeds, prints a production URL (e.g. `https://recolhas-ctt-circuitos.vercel.app`).

- [ ] **Step 6: Verify the deployed app**

Open the production URL on a phone browser:
1. Search page loads and returns results for a known street.
2. `/admin` redirects to `/admin/login`; log in with `ADMIN_PASSWORD`; confirm add/edit/delete work against the real Supabase data.

- [ ] **Step 7: Commit any `.gitignore` changes**

```bash
git add .gitignore
git commit -m "chore: ignore .vercel local config"
```

---

## Self-Review Notes

- **Spec coverage:** data model (Task 5), import (Tasks 4/6), normalization rule (Task 2), accent-insensitive search (Task 3), public search page (Task 13), protected admin CRUD (Tasks 8/9/14/15), reimport button (Task 11/15), password protection without user accounts (Tasks 7/10/12), free hosting on Vercel/Supabase (Task 16) — all covered.
- **Type consistency:** `Morada`/`MoradaInput` (Task 1) used consistently across Tasks 2-15; `SESSION_COOKIE_NAME` and `verifySessionToken`/`createSessionToken`/`isCorrectPassword` names match between Task 7 and their consumers in Tasks 8, 9, 10, 11, 12.
- **No placeholders:** every step has runnable code or an explicit manual instruction (Supabase dashboard, `.env.local`, Vercel CLI) — flagged as such rather than left vague.
