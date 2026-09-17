import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  preview: {
    host: true,                                  // listen on all interfaces
    allowedHosts: ['cms.apleixatechnologies.com'],
  },
})
