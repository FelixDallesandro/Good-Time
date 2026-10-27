import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Browsers refuse type="module" scripts over file://, so the built page is emitted as a
// classic script. That lets dist/index.html open by double-click as well as from a server.
const classicScript = (): Plugin => ({
  name: 'classic-script',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler: (html) =>
      html
        .replace(/<script type="module" crossorigin src=/g, '<script defer src=')
        .replace(/<link rel="stylesheet" crossorigin /g, '<link rel="stylesheet" ')
  }
});

export default defineConfig({
  base: './',
  build: { rollupOptions: { output: { format: 'iife', inlineDynamicImports: true } } },
  plugins: [
    react(),
    classicScript(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Good Time',
        short_name: 'Good Time',
        description: 'Serve your sentence. Walk out on your release date.',
        theme_color: '#14171c',
        background_color: '#14171c',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ],
  test: { include: ['tests/**/*.test.{ts,tsx}'] }
});
