'use client';

import { useEffect, useState } from 'react';
import Button from '@/components/Button';
import { useToast } from '@/components/ToastProvider';
import { Morada } from '@/lib/types';

type Props = {
  open: boolean;
  onClose: () => void;
  onSave?: () => void;
  morada?: Morada | null;
};

const emptyForm = {
  zona: '',
  categoria: '',
  nome: '',
  codigo_bruto: '',
};



export default function InsertMoradaModal({
  open,
  onClose,
  onSave,
  morada,
}: Props) {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  if (!open) return null;

  useEffect(() => {
    if (morada) {
      setForm(morada);
    } else {
      setForm(emptyForm);
    }
  }, [morada]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);

    try {
      const res = await fetch('/api/moradas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        toast.show('Morada adicionada com sucesso.');
        setForm(emptyForm);

        onSave?.();

        onClose();
      } else {
        const data = await res.json();
        toast.show(data.error ?? 'Erro ao guardar.');
      }
    } catch (err) {
      console.error(err);
      toast.show('Erro ao comunicar com o servidor.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">

        <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">
          Inserir Morada
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">

          <input
            className="w-full rounded-lg border border-gray-300 p-2 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            placeholder="Zona"
            value={form.zona}
            onChange={(e) =>
              setForm({ ...form, zona: e.target.value })
            }
          />

          <input
            className="w-full rounded-lg border border-gray-300 p-2 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            placeholder="Categoria"
            value={form.categoria}
            onChange={(e) =>
              setForm({ ...form, categoria: e.target.value })
            }
          />

          <input
            className="w-full rounded-lg border border-gray-300 p-2 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            placeholder="Nome"
            value={form.nome}
            onChange={(e) =>
              setForm({ ...form, nome: e.target.value })
            }
          />

          <input
            className="w-full rounded-lg border border-gray-300 p-2 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            placeholder="Código (A, OPE07, ...)"
            value={form.codigo_bruto}
            onChange={(e) =>
              setForm({ ...form, codigo_bruto: e.target.value })
            }
          />

          <div className="flex justify-end gap-2 pt-4">

            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setForm(emptyForm);
                onClose();
              }}
            >
              Cancelar
            </Button>

            <Button type="submit" disabled={loading}>
              {loading ? 'A guardar...' : 'Guardar'}
            </Button>

          </div>

        </form>

      </div>
    </div>
  );
}