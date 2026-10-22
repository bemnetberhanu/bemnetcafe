import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Habesha Restaurant Manager',
        short_name: 'Habesha POS',
        description: 'Manager POS app for Habesha Restaurant',
        theme_color: '#C8860A',
        background_color: '#f8f7f4',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  server: {
    port: 3001,
    proxy: {
      '/api': 'http://localhost:5001',
    },
  },
});
