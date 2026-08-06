import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages 專案站台（https://<user>.github.io/<repo>/）需要帶 base 路徑，
// 本地開發維持 '/'。可由 CI 透過 VITE_BASE_PATH 注入。
const base = process.env.VITE_BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'こどこ',
        short_name: 'こどこ',
        description: '今日、子どもとどこ行こう？',
        theme_color: '#e04a08',
        background_color: '#ffffff',
        display: 'standalone',
        lang: 'ja',
        start_url: base,
        scope: base,
        icons: [
          {
            src: 'pwa-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
          {
            src: 'pwa-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,ico}'],
        // GitHub Pages 專案站台沒有 SPA fallback：真實檔案路徑由 404.html 承載，
        // Service Worker 離線導航則回退到已預快取的 index.html。
        navigateFallback: `${base}index.html`,
        runtimeCaching: [
          {
            // 公共内容：地点数据使用 Stale While Revalidate 缓存（AGENTS.md 10.2）
            urlPattern: ({ request, url }) =>
              request.method === 'GET' && url.pathname.startsWith('/api/v1/places'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'kodoko-places',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});