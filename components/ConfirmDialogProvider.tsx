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
