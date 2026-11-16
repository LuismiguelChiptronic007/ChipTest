import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@backend': fileURLToPath(new URL('../backend/src', import.meta.url)),
    },
  },
})
