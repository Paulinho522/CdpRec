'use client';

import { useEffect, useState } from 'react';
import type { Morada } from '@/lib/types';
import Button from '@/components/Button';
import { useToast } from '@/components/ToastProvider';

type Props = {
  open: boolean;
  morada?: Morada | null;
  onClose: () => void;
  onSave: () => void;
};

const emptyForm = {
  zona: '',
  categoria: '',
  nome: '',
  codigo_bruto: '',
};

export default function InsertMoradaModal({
  open,
  morada,
  onClose,
  onSave,
}: Props) {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const editing = !!morada;

  useEffect(() => {
    if (morada) {
      setForm({
        zona: morada.zona,
        categoria: morada.categoria,
        nome: morada.nome,
        codigo_bruto: morada.codigo_bruto ?? '',
      });
    } else {
      setForm(emptyForm);
    }
  }, [morada, open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);

    const url = editing
      ? `/api/moradas/${morada?.id}`
      : '/api/moradas';

    const method = editing ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        toast.show(
          editing
            ? 'Entrada atualizada.'
            : 'Entrada criada.'
        );

        setForm(emptyForm);

        onSave();
        onClose();

      } else {
        const data = await res.json();
        toast.show(
          data.error ?? 'Erro ao guardar.',
          'error'
        );
      }

    } catch (error) {
      console.error(error);
      toast.show(
        'Erro ao comunicar com o servidor.',
        'error'
      );

    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">

      <div className="w-full max-w-xl rounded-xl bg-gray-50 p-6 shadow-xl dark:bg-gray-900">

        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          {editing ? 'Editar entrada' : 'Nova entrada'}
        </h2>


        <form
          onSubmit={handleSubmit}
          className="space-y-2"
        >

          <input
            className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 placeholder-gray-400 focus:border-ctt-red focus:outline-none focus:ring-2 focus:ring-ctt-red/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            placeholder="Zona (ex: 4100)"
            value={form.zona}
            onChange={(e) =>
              setForm({
                ...form,
                zona: e.target.value,
              })
            }
          />


          <input
            className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 placeholder-gray-400 focus:border-ctt-red focus:outline-none focus:ring-2 focus:ring-ctt-red/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            placeholder="Categoria (ex: Rua)"
            value={form.categoria}
            onChange={(e) =>
              setForm({
                ...form,
                categoria: e.target.value,
              })
            }
          />


          <input
            className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 placeholder-gray-400 focus:border-ctt-red focus:outline-none focus:ring-2 focus:ring-ctt-red/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            placeholder="Nome"
            value={form.nome}
            onChange={(e) =>
              setForm({
                ...form,
                nome: e.target.value,
              })
            }
          />


          <input
            className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 placeholder-gray-400 focus:border-ctt-red focus:outline-none focus:ring-2 focus:ring-ctt-red/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            placeholder="Código (ex: A ou OPE07)"
            value={form.codigo_bruto}
            onChange={(e) =>
              setForm({
                ...form,
                codigo_bruto: e.target.value,
              })
            }
          />


          <div className="flex gap-2 pt-4">

            <Button
              type="submit"
              disabled={loading}
            >
              {loading
                ? 'A guardar...'
                : editing
                  ? 'Guardar'
                  : 'Adicionar'}
            </Button>


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

          </div>

        </form>

      </div>

    </div>
  );
}