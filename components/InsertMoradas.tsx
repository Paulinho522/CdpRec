'use client';

import { useState } from 'react';
import Button from './Button';

type Props = {
  open: boolean;
  onClose: () => void;
  onSave?: (data: {
    nome: string;
    categoria: string;
    circuito: string;
    zona: string;
  }) => void;
};

export default function InsertMoradaModal({
  open,
  onClose,
  onSave,
}: Props) {
  const [form, setForm] = useState({
    nome: '',
    categoria: '',
    circuito: '',
    zona: '',
  });

  if (!open) return null;

  const guardar = () => {
    onSave?.(form);

    setForm({
      nome: '',
      categoria: '',
      circuito: '',
      zona: '',
    });

    onClose();
  };

  return (
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
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>

          <Button onClick={guardar}>
            Guardar
          </Button>
        </div>

      </div>
    </div>
  );
}