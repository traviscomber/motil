import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'MOTIL Mining OS',
    short_name: 'MOTIL',
    description: 'Sistema Operativo para Minería con operación, mantenimiento, personas, materiales y trazabilidad en una sola plataforma.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    orientation: 'any',
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/api/pwa/icon-192?v=motil-2',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/api/pwa/motil-icon-512?v=motil-2',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
