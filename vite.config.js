import { defineConfig } from 'vite'
import WindiCSS from 'vite-plugin-windicss'
import { VitePWA } from 'vite-plugin-pwa'
import SolidJS from 'vite-plugin-solid'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    SolidJS(),
    WindiCSS(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'apple-touch-icon.png',
        'audio.mp3',
        'favicon.ico',
        'ff.geojson',
        'robots.txt',
        'ukrainian_geodata/hromady.geojson',
        'ukrainian_geodata/rayony.geojson',
        'ukrainian_geodata/regiony.geojson'
      ],
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.maptiler\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'maptiler-resources',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // <== 1 day
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      manifest: {
        short_name: 'Повітряна тривога',
        name: 'Мапа повітряної тривоги',
        display: 'standalone',
        start_url: '/',
        background_color: '#1351af',
        theme_color: '#1351af',
        description: 'Інтерактивна мапа повітряної тривоги',
        icons: [
          {
            src: 'favicon.png',
            sizes: '32x32',
            type: 'image/png'
          },
          {
            src: 'android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
  server: {
    hmr: {
      timeout: 3000
    }
  }
})
