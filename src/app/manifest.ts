import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Recipes',
    short_name: 'Recipes',
    description: 'My recipe box, week plan and shopping list',
    start_url: '/',
    display: 'standalone',
    background_color: '#F3F8F2',
    theme_color: '#F3F8F2',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
