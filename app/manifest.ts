import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Recolhas CTT — Circuitos',
    short_name: 'Circuitos CTT',
    description: 'Pesquisa de circuitos por rua, freguesia ou cliente',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#e4032e',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
