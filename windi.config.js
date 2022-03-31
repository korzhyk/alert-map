import { defineConfig } from 'windicss/helpers'

export default defineConfig({
  extract: {
    include: ['index.html', 'src/**/*.{html,jsx,tsx}']
  },
  darkMode: 'media'
})
