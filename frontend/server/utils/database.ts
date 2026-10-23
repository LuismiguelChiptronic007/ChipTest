import type { H3Event } from 'h3'

interface WorkerRuntimeEnv {
  SESSION_SECRET?: string
  RESEND_API_KEY?: string
  APP_URL?: string
  EMAIL_FROM?: string
}

function isD1Database(value: unknown): value is D1Database {
  return typeof value === 'object'
    && value !== null
    && 'prepare' in value
    && typeof value.prepare === 'function'
}

function getRawWorkerEnv(event: H3Event): Record<string, unknown> {
  const env = event.context.cloudflare?.env
  if (!env) {
    throw createError({
      statusCode: 503,
      statusMessage: 'O ambiente Cloudflare não está disponível para esta requisição.',
    })
  }
  return env
}

function isR2Bucket(value: unknown): value is R2Bucket {
  return typeof value === 'object'
    && value !== null
    && 'put' in value
    && typeof value.put === 'function'
    && 'get' in value
    && typeof value.get === 'function'
    && 'delete' in value
    && typeof value.delete === 'function'
}

export function getDatabase(event: H3Event): D1Database {
  const database: unknown = getRawWorkerEnv(event).DB
  if (!isD1Database(database)) {
    throw createError({
      statusCode: 503,
      statusMessage: 'O banco D1 não está disponível. Confira a configuração do Cloudflare.',
    })
  }
  return database
}

export function getImportacoesBucket(event: H3Event): R2Bucket {
  const bucket: unknown = getRawWorkerEnv(event).IMPORTS_BUCKET
  if (!isR2Bucket(bucket)) {
    throw createError({
      statusCode: 503,
      statusMessage: 'O armazenamento privado de importações não está configurado no Cloudflare R2.',
    })
  }
  return bucket
}

export function getWorkerEnv(event: H3Event): WorkerRuntimeEnv {
  const env = getRawWorkerEnv(event)
  const stringValue = (key: string): string | undefined => {
    const value = env[key]
    return typeof value === 'string' ? value : undefined
  }
  return {
    SESSION_SECRET: stringValue('SESSION_SECRET'),
    RESEND_API_KEY: stringValue('RESEND_API_KEY'),
    APP_URL: stringValue('APP_URL'),
    EMAIL_FROM: stringValue('EMAIL_FROM'),
  }
}
