'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Morada } from '@/lib/types';
import Card from '@/components/Card';
import Skeleton from '@/components/Skeleton';
import Button from '@/components/Button';

export default function SearchPage() {
  const router = useRouter();
  const [all, setAll] = useState<Morada[]>([]);
  const [showModal, setShowModal] = useState(false);
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

  const [form, setForm] = useState({
    nome: '',
    categoria: '',
    circuito: '',
    zona: '',
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50/95 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
        <div className="mx-auto max-w-xl px-4 pt-4 pb-3">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Recolhas CTT — Circuitos
            </h1>
              <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowModal(true)}
              >
                Inserir Dados
              </Button>

              <Button
                variant="secondary"
                onClick={() => router.push('/admin')}
              >
                Administração
              </Button>
            </div>
          </div>
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
      </div>
      {showModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
          <h2 className="mb-4 text-xl font-bold">
            Inserir Morada
          </h2>

          <div className="space-y-3">

            <input
              className="w-full rounded border p-2"
              placeholder="Nome"
              value={form.nome}
              onChange={(e) =>
                setForm({ ...form, nome: e.target.value })
              }
            />

            <input
              className="w-full rounded border p-2"
              placeholder="Categoria"
              value={form.categoria}
              onChange={(e) =>
                setForm({ ...form, categoria: e.target.value })
              }
            />

            <input
              className="w-full rounded border p-2"
              placeholder="Circuito"
              value={form.circuito}
              onChange={(e) =>
                setForm({ ...form, circuito: e.target.value })
              }
            />

            <input
              className="w-full rounded border p-2"
              placeholder="Zona"
              value={form.zona}
              onChange={(e) =>
                setForm({ ...form, zona: e.target.value })
              }
            />

          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowModal(false)}
            >
              Cancelar
            </Button>

            <Button
              onClick={async () => {
              console.log(form);

              // await fetch('/api/moradas', {...})

              setForm({
                nome: '',
                categoria: '',
                circuito: '',
                zona: '',
              });

              setShowModal(false);
              }}
            >
              Guardar
            </Button>
          </div>
        </div>
      </div>
    )}
  </div>
  );
}
