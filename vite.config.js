import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import SolidJS from 'vite-plugin-solid'
import Unocss from 'unocss/vite'
import { presetUno } from 'unocss'

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    'import.meta.env.PACKAGE_VERSION': JSON.stringify(process.env.npm_package_version),
    'import.meta.env.CF_PAGES_COMMIT_SHA': JSON.stringify(process.env.CF_PAGES_COMMIT_SHA || '')
  },
  plugins: [
    SolidJS(),
    Unocss({
      presets: [presetUno()],
      shortcuts: {
        'icon': 'w-6 h-6 stroke-2',
        'blur-box':
          'bg-white/70 @dark:bg-black/70 backdrop-filter backdrop-blur rounded-full shadow-xl'
      }
    }),
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
        name: 'Мапа повітряної тривоги в Україні',
        display: 'standalone',
        start_url: '/',
        background_color: '#1351af',
        theme_color: '#1351af',
        description: 'Інтерактивна мапа повітряної тривоги в Україні',
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
