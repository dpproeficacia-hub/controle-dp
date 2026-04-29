import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'DPSmart — Departamento Pessoal',
        short_name: 'DPSmart',
        description: 'Sistema de gestão de Departamento Pessoal',
        theme_color: '#1C1B19',
        background_color: '#F4F3EF',
        display: 'standalone',
        orientation: 'landscape',
        start_url: '/',
        icons: [
          { src: 'logo192.png', sizes: '192x192', type: 'image/png' },
          { src: 'logo512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://controle-dp-backend.onrender.com',
        changeOrigin: true,
        secure: true
      }
    }
  }
});
