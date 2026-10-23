import 'nitro-cloudflare-dev'

declare global {
  interface Env {
    SESSION_SECRET?: string
    RESEND_API_KEY?: string
  }
}

declare module 'h3' {
  interface H3EventContext {
    cloudflare: {
      env: Env
      context: ExecutionContext
      request: Request
    }
  }
}

export {}
