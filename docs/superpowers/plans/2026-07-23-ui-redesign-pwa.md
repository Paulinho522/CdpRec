# UI Redesign + PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the existing three pages (public search, admin login, admin listing) with Tailwind CSS and a small set of custom components (Toast, ConfirmDialog, Skeleton, Button, Card) for a more dynamic/polished feel, and make the app installable as a PWA.

**Architecture:** Tailwind CSS v4 (CSS-first config, no `tailwind.config.ts` needed) replaces the hand-written `app/globals.css`. A handful of small client components under `components/` provide reusable UI primitives and app-wide context providers (toast queue, confirm dialog), wired into `app/layout.tsx`. PWA support uses Next's native `app/manifest.ts` file convention plus a hand-rolled minimal service worker (app-shell caching only — no data caching, since search/admin data must always be live from Supabase).

**Tech Stack:** Next.js 15.5.21 (App Router), React 19, Tailwind CSS v4, `sharp` (already used internally by Next; added directly for icon generation).

## Global Constraints

- Primary accent color: CTT red `#e4032e` (defined once as `--color-ctt-red` / `--color-ctt-red-dark` in `@theme`, exposed as Tailwind utilities like `bg-ctt-red`).
- Dark mode: automatic via `prefers-color-scheme` only — Tailwind v4's default `dark:` behavior. No manual toggle.
- Minimum interactive touch target: 44px (`min-h-11` in Tailwind's 4px scale).
- No new dependencies beyond `tailwindcss`, `@tailwindcss/postcss`, `sharp` — no UI component library (no shadcn/ui, no animation library).
- No offline data caching — the service worker caches only the static app shell; `/api/*` requests always go to the network.
- No new navigation bar — the existing plain "Administração" link stays.
- This is UI/interaction work: **no automated tests**, matching the existing convention set by Tasks 13-15 of `docs/superpowers/plans/2026-07-21-recolhas-circuitos.md` (verified manually in the browser). Every task still runs `npx tsc --noEmit` and the existing `npm test` suite (32 tests) to confirm nothing broke.

---

### Task 1: Install and configure Tailwind CSS v4

**Files:**
- Create: `postcss.config.mjs`
- Modify: `app/globals.css`
- Modify: `package.json` (adds `tailwindcss`, `@tailwindcss/postcss` devDependencies)

**Interfaces:**
- Produces: `--color-ctt-red` / `--color-ctt-red-dark` Tailwind theme colors (→ `bg-ctt-red`, `text-ctt-red`, etc.), and utility classes `.animate-skeleton-pulse`, `.animate-toast-slide-in`, `.animate-fade-in` — used by every later task's components/pages.

- [x] **Step 1: Install Tailwind CSS v4**

Run: `npm install -D --save-exact tailwindcss @tailwindcss/postcss`
Expected: `package.json` gains both packages under `devDependencies` with exact pinned versions, no errors.

- [x] **Step 2: Create `postcss.config.mjs`**

```js
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
```

- [x] **Step 3: Update `app/globals.css`**

Prepend the Tailwind import, theme, and animation utilities. Keep the existing hand-written classes below for now — later tasks (6, 7, 8) migrate each page off them, and Task 9 removes them once nothing references them.

```css
@import "tailwindcss";

@theme {
  --color-ctt-red: #e4032e;
  --color-ctt-red-dark: #b8022d;
}

@keyframes skeleton-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

@keyframes toast-slide-in {
  from { transform: translateY(1rem); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.animate-skeleton-pulse {
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.animate-toast-slide-in {
  animation: toast-slide-in 0.2s ease-out;
}

.animate-fade-in {
  animation: fade-in 0.25s ease-out;
}

/* --- Legacy classes below, still used by not-yet-rewritten pages.
   Removed in Task 9 once every page uses Tailwind utilities instead. --- */
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

- [x] **Step 4: Verify the build picks up Tailwind**

Run: `npx tsc --noEmit`
Expected: no output (clean).

Run (in one terminal, with the local network proxy env vars from `.superpowers/sdd/progress.md` if Supabase calls are needed — this step doesn't need them since it's just a build/style check): `npm run dev`
Expected: server starts without PostCSS/Tailwind errors in the log. Stop the server after confirming (Ctrl+C or `TaskStop`).

- [x] **Step 5: Commit**

```bash
git add postcss.config.mjs app/globals.css package.json package-lock.json
git commit -m "chore: install and configure Tailwind CSS v4"
```

---

### Task 2: Shared UI primitives — Button, Card, Skeleton

**Files:**
- Create: `components/Button.tsx`
- Create: `components/Card.tsx`
- Create: `components/Skeleton.tsx`

**Interfaces:**
- Consumes: `--color-ctt-red` / animation utilities (Task 1).
- Produces: `Button` (default export, props: `variant?: 'primary'|'secondary'|'danger'`, plus all native `<button>` props), `Card` (default export, props: `children`, `className?`), `Skeleton` (default export, props: `count?: number`) — used by Tasks 4, 6, 7, 8.

- [x] **Step 1: Create `components/Button.tsx`**

```tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-ctt-red text-white hover:bg-ctt-red-dark active:scale-[0.98]',
  secondary:
    'bg-gray-100 text-gray-900 hover:bg-gray-200 active:scale-[0.98] dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:scale-[0.98]',
};

export default function Button({
  variant = 'primary',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`min-h-11 rounded-lg px-4 py-2 font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
```

- [x] **Step 2: Create `components/Card.tsx`**

```tsx
import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`animate-fade-in rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800 ${className}`}
    >
      {children}
    </div>
  );
}
```

- [x] **Step 3: Create `components/Skeleton.tsx`**

```tsx
interface SkeletonProps {
  count?: number;
}

export default function Skeleton({ count = 4 }: SkeletonProps) {
  return (
    <div className="space-y-2" role="status" aria-label="A carregar">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-skeleton-pulse h-16 rounded-xl bg-gray-200 dark:bg-gray-700"
        />
      ))}
    </div>
  );
}
```

- [x] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no output (clean). Nothing imports these components yet — that's fine, unused exports aren't a TypeScript error.

- [x] **Step 5: Commit**

```bash
git add components/Button.tsx components/Card.tsx components/Skeleton.tsx
git commit -m "feat: add Button, Card, Skeleton UI primitives"
```

---

### Task 3: ToastProvider + useToast hook

**Files:**
- Create: `components/ToastProvider.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces: `ToastProvider` (named export, wraps children), `useToast()` (named export, returns `{ show: (message: string, variant?: 'success' | 'error') => void }`) — used by Task 8.

- [x] **Step 1: Create `components/ToastProvider.tsx`**

```tsx
'use client';

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type ToastVariant = 'success' | 'error';

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 3000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);

  const remove = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, variant: ToastVariant = 'success') => {
      counterRef.current += 1;
      const id = `toast-${counterRef.current}`;
      setToasts((current) => [...current, { id, message, variant }]);
      setTimeout(() => remove(id), AUTO_DISMISS_MS);
    },
    [remove]
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`animate-toast-slide-in pointer-events-auto w-full max-w-sm rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${
              toast.variant === 'error' ? 'bg-red-600' : 'bg-gray-900 dark:bg-gray-700'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
```

- [x] **Step 2: Wire `ToastProvider` into `app/layout.tsx`**

```tsx
import './globals.css';
import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/ToastProvider';

export const metadata = {
  title: 'Recolhas CTT — Circuitos',
  description: 'Pesquisa de circuitos por rua, freguesia ou cliente',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
```

- [x] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no output (clean).

- [x] **Step 4: Commit**

```bash
git add components/ToastProvider.tsx app/layout.tsx
git commit -m "feat: add ToastProvider"
```

---

### Task 4: ConfirmDialogProvider + useConfirm hook

**Files:**
- Create: `components/ConfirmDialogProvider.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `Button` (Task 2).
- Produces: `ConfirmDialogProvider` (named export, wraps children), `useConfirm()` (named export, returns `(options: { title: string; message: string }) => Promise<boolean>`) — used by Task 8.

- [x] **Step 1: Create `components/ConfirmDialogProvider.tsx`**

```tsx
'use client';

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import Button from './Button';

interface ConfirmOptions {
  title: string;
  message: string;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmDialogContext = createContext<ConfirmFn | null>(null);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  function handle(result: boolean) {
    setOptions(null);
    resolveRef.current?.(result);
    resolveRef.current = null;
  }

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}
      {options && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="animate-fade-in w-full max-w-sm rounded-xl bg-white p-5 shadow-xl dark:bg-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {options.title}
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              {options.message}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => handle(false)}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={() => handle(true)}>
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within a ConfirmDialogProvider');
  }
  return ctx;
}
```

- [x] **Step 2: Wire `ConfirmDialogProvider` into `app/layout.tsx`**

```tsx
import './globals.css';
import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/ToastProvider';
import { ConfirmDialogProvider } from '@/components/ConfirmDialogProvider';

export const metadata = {
  title: 'Recolhas CTT — Circuitos',
  description: 'Pesquisa de circuitos por rua, freguesia ou cliente',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt">
      <body>
        <ToastProvider>
          <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
```

- [x] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no output (clean).

- [x] **Step 4: Commit**

```bash
git add components/ConfirmDialogProvider.tsx app/layout.tsx
git commit -m "feat: add ConfirmDialogProvider"
```

---

### Task 5: PWA assets — icons, manifest, service worker

**Files:**
- Create: `public/icons/icon.svg`
- Create: `public/icons/icon-maskable.svg`
- Create: `scripts/generate-icons.ts`
- Create: `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/icon-512-maskable.png`, `public/icons/apple-touch-icon.png` (generated by the script, committed)
- Create: `app/manifest.ts`
- Create: `public/sw.js`
- Create: `components/ServiceWorkerRegister.tsx`
- Modify: `app/layout.tsx`
- Modify: `package.json` (adds `sharp` devDependency)

**Interfaces:**
- Produces: `/manifest.webmanifest` (via Next's `app/manifest.ts` convention), `/sw.js`, `/icons/*.png` — no other task depends on these directly, but Task 9's final verification checks them.

- [x] **Step 1: Add `sharp` as an explicit devDependency**

`sharp` is already installed transitively (Next uses it for image optimization, pinned via the `overrides` field in `package.json` to `0.35.3`). This step adds it as a direct devDependency at the same version so `scripts/generate-icons.ts` can `import sharp from 'sharp'` reliably regardless of hoisting.

Run: `npm install -D --save-exact sharp@0.35.3`
Expected: `sharp` appears under `devDependencies` in `package.json`.

- [x] **Step 2: Create the icon source SVGs**

Run: `mkdir -p public/icons`

Create `public/icons/icon.svg` (used for the 192/512/apple-touch icons — rounded red square with a white "location ring" glyph):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="96" fill="#e4032e"/>
  <circle cx="256" cy="220" r="90" fill="none" stroke="#ffffff" stroke-width="28"/>
  <rect x="234" y="300" width="44" height="140" rx="22" fill="#ffffff"/>
</svg>
```

Create `public/icons/icon-maskable.svg` (used only for the maskable icon — full-bleed square, no rounding, glyph shrunk to fit Android's ~80% safe zone):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#e4032e"/>
  <circle cx="256" cy="234" r="63" fill="none" stroke="#ffffff" stroke-width="20"/>
  <rect x="240" y="290" width="32" height="100" rx="16" fill="#ffffff"/>
</svg>
```

- [x] **Step 3: Create `scripts/generate-icons.ts`**

```ts
import sharp from 'sharp';
import * as path from 'path';

const ICONS_DIR = path.resolve(__dirname, '..', 'public', 'icons');

async function main() {
  await sharp(path.join(ICONS_DIR, 'icon.svg'))
    .resize(192, 192)
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-192.png'));

  await sharp(path.join(ICONS_DIR, 'icon.svg'))
    .resize(512, 512)
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-512.png'));

  await sharp(path.join(ICONS_DIR, 'icon-maskable.svg'))
    .resize(512, 512)
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-512-maskable.png'));

  // iOS ignores alpha transparency on the home screen icon; flatten onto the
  // brand red so there's no unexpected black background.
  await sharp(path.join(ICONS_DIR, 'icon.svg'))
    .resize(180, 180)
    .flatten({ background: '#e4032e' })
    .png()
    .toFile(path.join(ICONS_DIR, 'apple-touch-icon.png'));

  console.log('Icons generated in', ICONS_DIR);
}

main();
```

- [x] **Step 4: Run the generator and verify the output files**

Run: `npx tsx scripts/generate-icons.ts`
Expected: prints `Icons generated in .../public/icons`, and `public/icons/icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `apple-touch-icon.png` all exist.

- [x] **Step 5: Create `app/manifest.ts`**

```ts
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Recolhas CTT — Circuitos',
    short_name: 'Circuitos CTT',
    description: 'Pesquisa de circuitos por rua, freguesia ou cliente',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#e4032e',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
```

- [x] **Step 6: Create `public/sw.js`**

```js
const CACHE_NAME = 'recolhas-ctt-shell-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;
  if (request.url.includes('/api/')) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
```

- [x] **Step 7: Create `components/ServiceWorkerRegister.tsx`**

```tsx
'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('Service worker registration failed:', error);
      });
    }
  }, []);

  return null;
}
```

- [x] **Step 8: Wire icons, theme color, and service worker registration into `app/layout.tsx`**

```tsx
import './globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/ToastProvider';
import { ConfirmDialogProvider } from '@/components/ConfirmDialogProvider';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';

export const metadata: Metadata = {
  title: 'Recolhas CTT — Circuitos',
  description: 'Pesquisa de circuitos por rua, freguesia ou cliente',
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#e4032e',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt">
      <body>
        <ServiceWorkerRegister />
        <ToastProvider>
          <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
```

- [x] **Step 9: Verify**

Run: `npx tsc --noEmit`
Expected: no output (clean).

Run: `npm run dev` (background), then:
```bash
curl.exe -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/manifest.webmanifest
curl.exe -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/sw.js
curl.exe -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/icons/icon-192.png
```
Expected: all three print `200`. (Port may differ if 3000 is occupied — check the dev server's own startup log for the actual port, same as earlier in this project.) Stop the dev server after.

Manual check (browser, DevTools → Application → Manifest): no errors shown, icons listed correctly.

- [x] **Step 10: Commit**

```bash
git add public/icons app/manifest.ts public/sw.js components/ServiceWorkerRegister.tsx app/layout.tsx scripts/generate-icons.ts package.json package-lock.json
git commit -m "feat: add PWA manifest, icons, and service worker"
```

---

### Task 6: Rewrite the public search page with Tailwind

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `Card`, `Skeleton` (Task 2); `GET /api/moradas` (existing).

- [x] **Step 1: Rewrite `app/page.tsx`**

```tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import type { Morada } from '@/lib/types';
import Card from '@/components/Card';
import Skeleton from '@/components/Skeleton';

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50/95 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
        <div className="mx-auto max-w-xl px-4 pt-4 pb-3">
          <h1 className="mb-3 text-xl font-bold text-gray-900 dark:text-gray-100">
            Recolhas CTT — Circuitos
          </h1>
          <input
            className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 placeholder-gray-400 focus:border-ctt-red focus:outline-none focus:ring-2 focus:ring-ctt-red/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            placeholder="Pesquisar rua, freguesia ou cliente..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="min-h-11 mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 focus:border-ctt-red focus:outline-none focus:ring-2 focus:ring-ctt-red/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
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
        </div>
      </div>

      <div className="mx-auto max-w-xl space-y-2 px-4 py-4">
        {loading && <Skeleton />}
        {!loading && results.length === 0 && (
          <p className="py-8 text-center text-gray-500 dark:text-gray-400">
            Sem resultados.
          </p>
        )}
        {results.slice(0, 200).map((m) => (
          <Card key={m.id}>
            <div className="text-xl font-bold text-ctt-red">
              {m.circuito || '(sem circuito)'}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {m.categoria} · {m.nome} · zona {m.zona}
            </div>
          </Card>
        ))}

        <a
          className="block py-6 text-center text-sm text-gray-400 hover:text-ctt-red dark:text-gray-500"
          href="/admin"
        >
          Administração
        </a>
      </div>
    </div>
  );
}
```

- [x] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output (clean).

- [x] **Step 3: Manual browser verification**

Run: `npm run dev` (with the local network proxy running per `.superpowers/sdd/progress.md`, and `.env.local` filled in). Open the app's URL.
Expected:
1. Header stays fixed while scrolling results.
2. Skeleton briefly appears on first load, then real results.
3. Typing a known street (e.g. "bessa") shows the right card; works with/without accents.
4. Zona dropdown filters correctly.
5. Switching the OS/browser to dark mode flips the page to the dark palette automatically.
6. On a narrow/mobile viewport (DevTools device toolbar), inputs and the search field are comfortably tappable.

- [x] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: restyle public search page with Tailwind"
```

---

### Task 7: Rewrite the admin login page with Tailwind

**Files:**
- Modify: `app/admin/login/page.tsx`

**Interfaces:**
- Consumes: `Button` (Task 2); `POST /api/admin/login` (existing).

- [x] **Step 1: Rewrite `app/admin/login/page.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
      headers: { 'Content-Type': 'application/json' },
    });
    setSubmitting(false);
    if (res.ok) {
      router.push('/admin');
    } else {
      setError('Password incorreta.');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-xl font-bold text-gray-900 dark:text-gray-100">
          Administração
        </h1>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 placeholder-gray-400 focus:border-ctt-red focus:outline-none focus:ring-2 focus:ring-ctt-red/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'A entrar...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  );
}
```

- [x] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output (clean).

- [x] **Step 3: Manual browser verification**

Run: `npm run dev`. Open `/admin` (redirects to `/admin/login` per middleware).
Expected: wrong password shows the red error text; correct `ADMIN_PASSWORD` (from `.env.local`) redirects to `/admin`; the submit button shows "A entrar..." briefly and is disabled while submitting; looks correct in both light and dark mode.

- [x] **Step 4: Commit**

```bash
git add app/admin/login/page.tsx
git commit -m "feat: restyle admin login page with Tailwind"
```

---

### Task 8: Rewrite the admin listing page with Tailwind, Toast, ConfirmDialog, Skeleton

**Files:**
- Modify: `app/admin/page.tsx`

**Interfaces:**
- Consumes: `Button`, `Card`, `Skeleton` (Task 2); `useToast` (Task 3); `useConfirm` (Task 4); `GET/POST /api/moradas`, `PUT/DELETE /api/moradas/[id]`, `POST /api/import`, `POST /api/admin/logout` (existing).

- [x] **Step 1: Rewrite `app/admin/page.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Morada } from '@/lib/types';
import Button from '@/components/Button';
import Card from '@/components/Card';
import Skeleton from '@/components/Skeleton';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmDialogProvider';

const emptyForm = { zona: '', categoria: '', nome: '', codigo_bruto: '' };

export default function AdminPage() {
  const [moradas, setMoradas] = useState<Morada[]>([]);
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();

  async function reload() {
    const res = await fetch('/api/moradas');
    const data = await res.json();
    setMoradas(data.moradas ?? []);
  }

  useEffect(() => {
    reload().finally(() => setLoading(false));
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
      toast.show(editingId ? 'Entrada atualizada.' : 'Entrada criada.');
      reload();
    } else {
      const data = await res.json();
      toast.show(data.error ?? 'Erro ao guardar.', 'error');
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
    const ok = await confirm({
      title: 'Apagar entrada',
      message: 'Tens a certeza que queres apagar esta entrada?',
    });
    if (!ok) return;
    const res = await fetch(`/api/moradas/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.show('Entrada apagada.');
      reload();
    } else {
      toast.show('Erro ao apagar.', 'error');
    }
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!importFile) return;
    const ok = await confirm({
      title: 'Reimportar Excel',
      message:
        'Isto substitui TODOS os dados atuais pelo conteúdo deste ficheiro Excel. Continuar?',
    });
    if (!ok) return;
    const formData = new FormData();
    formData.set('file', importFile);
    const res = await fetch('/api/import', { method: 'POST', body: formData });
    const data = await res.json();
    if (res.ok) {
      toast.show(`Importadas ${data.count} linhas.`);
      setImportFile(null);
      reload();
    } else {
      toast.show(`Erro: ${data.error}`, 'error');
    }
  }

  const visible = moradas.filter((m) =>
    `${m.zona} ${m.categoria} ${m.nome} ${m.circuito}`
      .toLowerCase()
      .includes(filter.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-12 dark:bg-gray-900">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-gray-50/95 px-4 py-3 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Administração
        </h1>
        <Button variant="secondary" onClick={handleLogout}>
          Sair
        </Button>
      </div>

      <div className="mx-auto max-w-xl space-y-6 px-4 py-4">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
            {editingId ? 'Editar entrada' : 'Nova entrada'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-2">
            <input
              className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 placeholder-gray-400 focus:border-ctt-red focus:outline-none focus:ring-2 focus:ring-ctt-red/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              placeholder="Zona (ex: 4100)"
              value={form.zona}
              onChange={(e) => setForm({ ...form, zona: e.target.value })}
            />
            <input
              className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 placeholder-gray-400 focus:border-ctt-red focus:outline-none focus:ring-2 focus:ring-ctt-red/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              placeholder="Categoria (ex: Rua)"
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
            />
            <input
              className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 placeholder-gray-400 focus:border-ctt-red focus:outline-none focus:ring-2 focus:ring-ctt-red/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              placeholder="Nome"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
            <input
              className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 placeholder-gray-400 focus:border-ctt-red focus:outline-none focus:ring-2 focus:ring-ctt-red/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              placeholder="Código (ex: A ou OPE07)"
              value={form.codigo_bruto}
              onChange={(e) => setForm({ ...form, codigo_bruto: e.target.value })}
            />
            <div className="flex gap-2">
              <Button type="submit">{editingId ? 'Guardar' : 'Adicionar'}</Button>
              {editingId && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setEditingId(null);
                    setForm(emptyForm);
                  }}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
            Reimportar Excel
          </h2>
          <form onSubmit={handleImport} className="space-y-2">
            <input
              type="file"
              accept=".xlsx"
              onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-700 dark:text-gray-300"
            />
            <Button type="submit" variant="secondary" disabled={!importFile}>
              Reimportar (substitui tudo)
            </Button>
          </form>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
            Todas as entradas ({visible.length})
          </h2>
          <input
            className="min-h-11 mb-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 placeholder-gray-400 focus:border-ctt-red focus:outline-none focus:ring-2 focus:ring-ctt-red/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            placeholder="Filtrar..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <div className="space-y-2">
            {loading && <Skeleton />}
            {!loading &&
              visible.slice(0, 200).map((m) => (
                <Card key={m.id}>
                  <div className="text-xl font-bold text-ctt-red">
                    {m.circuito || '(sem circuito)'}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {m.categoria} · {m.nome} · zona {m.zona}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button variant="secondary" onClick={() => startEdit(m)}>
                      Editar
                    </Button>
                    <Button variant="danger" onClick={() => handleDelete(m.id)}>
                      Apagar
                    </Button>
                  </div>
                </Card>
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}
```

- [x] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output (clean).

- [x] **Step 3: Manual browser verification**

Run: `npm run dev` (with the local network proxy running, `.env.local` filled in). Log in at `/admin/login`, then on `/admin`:
1. Add a test entry (zona `9999`, categoria `Rua`, nome `TESTE`, código `A`) → toast "Entrada criada.", card appears immediately with circuito `9999A`.
2. Edit it (código → `B`) → toast "Entrada atualizada.", circuito updates to `9999B`.
3. Delete it → styled confirm dialog appears (not the browser's native `confirm()`); confirming shows toast "Entrada apagada." and the card disappears.
4. Confirm the changes also show on the public `/` search page.
5. Skeleton appears briefly on first load of `/admin`.
6. Dark mode follows the system automatically; buttons/inputs are comfortably tappable on a mobile viewport.

Clean up any test data left in Supabase afterward (delete the `9999` entry via the UI itself, using the Delete button — this doubles as verifying the delete flow).

- [x] **Step 4: Commit**

```bash
git add app/admin/page.tsx
git commit -m "feat: restyle admin page with Tailwind, toasts, and confirm dialogs"
```

---

### Task 9: Remove legacy CSS and do a final full-app check

**Files:**
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: nothing new — this is cleanup once Tasks 6-8 mean no page references the legacy classes anymore.

- [x] **Step 1: Strip the legacy classes from `app/globals.css`**

```css
@import "tailwindcss";

@theme {
  --color-ctt-red: #e4032e;
  --color-ctt-red-dark: #b8022d;
}

@keyframes skeleton-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

@keyframes toast-slide-in {
  from { transform: translateY(1rem); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.animate-skeleton-pulse {
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.animate-toast-slide-in {
  animation: toast-slide-in 0.2s ease-out;
}

.animate-fade-in {
  animation: fade-in 0.25s ease-out;
}
```

- [x] **Step 2: Verify nothing still references the removed classes**

Run: `grep -rn "search-input\|zona-select\|admin-link\|className=\"card\"" app/ --include=*.tsx`
Expected: no matches (Tasks 6-8 already replaced every usage with Tailwind utilities).

- [x] **Step 3: Full verification**

Run: `npx tsc --noEmit`
Expected: no output (clean).

Run: `npm test`
Expected: `Test Files 9 passed (9)`, `Tests 32 passed (32)` — unchanged from before this plan (this work touched no `lib/`/`app/api/` code).

Run: `npm run dev` (with the local network proxy running, `.env.local` filled in). Smoke-check both `/` and `/admin` render correctly with no missing styles (nothing was silently still depending on a removed class), and re-check DevTools → Application → Manifest/Service Worker one more time now that the CSS is final.

- [x] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "chore: remove legacy hand-written CSS now that Tailwind covers every page"
```

---
