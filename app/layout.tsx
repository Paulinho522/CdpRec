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
