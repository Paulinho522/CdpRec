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
