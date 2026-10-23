import { fileURLToPath } from 'node:url'
import { defineNuxtModule } from '@nuxt/kit'

const cloudflareNitroPreset = defineNuxtModule({
  setup(_options, nuxt) {
    nuxt.hook('nitro:config', (config) => {
      const preset = process.env.VERCEL === '1' ? 'vercel' : 'cloudflare-module'
      Object.assign(config, {
        preset,
        ...(preset === 'cloudflare-module' ? { compatibilityDate: '2026-10-22' } : {}),
      })
    })
  },
})

export default defineNuxtConfig({
  alias: {
    '@backend': fileURLToPath(new URL('../backend/src', import.meta.url)),
  },
  vite: {
    server: {
      fs: {
        allow: [
          fileURLToPath(new URL('.', import.meta.url)),
          fileURLToPath(new URL('../backend', import.meta.url)),
        ],
      },
    },
  },
  modules: [cloudflareNitroPreset, '@pinia/nuxt', '@nuxtjs/tailwindcss', 'nitro-cloudflare-dev'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'pt-BR' },
      title: 'ChipTest',
      meta: [
        { name: 'description', content: 'Gestão de códigos e testes veiculares da Chiptronic.' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
    },
  },
  runtimeConfig: {
    appUrl: '',
    sessionSecret: '',
    resendApiKey: '',
    emailFrom: 'ChipTest <onboarding@resend.dev>',
  },
  typescript: {
    strict: true,
    typeCheck: true,
    tsConfig: {
      compilerOptions: {
        types: ['@cloudflare/workers-types', 'node'],
        paths: {
          htmlparser2: ['../node_modules/htmlparser2'],
          domhandler: ['../node_modules/domhandler'],
          zod: ['../node_modules/zod'],
        },
      },
      exclude: ['../../backend/**/*.test.ts'],
    },
  },
})
