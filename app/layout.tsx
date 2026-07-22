import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Recolhas CTT — Circuitos',
  description: 'Pesquisa de circuitos por rua, freguesia ou cliente',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt">
      <body>{children}</body>
    </html>
  );
}
