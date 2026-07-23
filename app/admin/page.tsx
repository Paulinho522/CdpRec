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
