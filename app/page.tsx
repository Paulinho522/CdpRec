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
