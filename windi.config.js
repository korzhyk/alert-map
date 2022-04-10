import { defineConfig } from 'windicss/helpers'

export default defineConfig({
  extract: {
    include: ['index.html', 'src/**/*.{html,jsx,tsx}']
  },
  darkMode: 'media',
  shortcuts: {
    'icon': 'w-6 h-6 stroke-2',
    'blur-box': 'bg-white/65 backdrop-filter backdrop-blur rounded-full shadow-xl'
  }
})
