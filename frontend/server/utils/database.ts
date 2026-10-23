import type { H3Event } from 'h3'

interface WorkerRuntimeEnv {
  SESSION_SECRET?: string
  RESEND_API_KEY?: string
  APP_URL?: string
  EMAIL_FROM?: string
  CLOUDFLARE_ACCOUNT_ID?: string
  CLOUDFLARE_D1_DATABASE_ID?: string
  CLOUDFLARE_API_TOKEN?: string
}

interface D1RestMeta {
  duration?: number
  size_after?: number
  rows_read?: number
  rows_written?: number
  last_row_id?: number
  changed_db?: boolean
  changes?: number
  served_by_region?: string
  served_by_colo?: string
  served_by_primary?: boolean
  timings?: { sql_duration_ms: number }
}

interface D1RestResult {
  success?: boolean
  results?: unknown[]
  meta?: D1RestMeta
}

interface D1RestResponse {
  success?: boolean
  errors?: Array<{ message?: string }>
  result?: D1RestResult[]
}

interface D1RestQuery {
  sql: string
  params: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function escaparParametrosParaApi(query: string, values: unknown[]): D1RestQuery {
  const params: string[] = []
  let sql = ''
  let valueIndex = 0
  let quote: "'" | '"' | '`' | ']' | null = null
  let lineComment = false
  let blockComment = false

  for (let index = 0; index < query.length; index += 1) {
    const character = query[index]!
    const next = query[index + 1]

    if (lineComment) {
      sql += character
      if (character === '\n') lineComment = false
      continue
    }
    if (blockComment) {
      sql += character
      if (character === '*' && next === '/') {
        sql += next
        index += 1
        blockComment = false
      }
      continue
    }
    if (quote) {
      sql += character
      if (character === quote) {
        if (next === quote && quote !== ']') {
          sql += next
          index += 1
        } else {
          quote = null
        }
      }
      continue
    }
    if (character === '-' && next === '-') {
      sql += '--'
      index += 1
      lineComment = true
      continue
    }
    if (character === '/' && next === '*') {
      sql += '/*'
      index += 1
      blockComment = true
      continue
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character
      sql += character
      continue
    }
    if (character === '[') {
      quote = ']'
      sql += character
      continue
    }
    if (character !== '?') {
      sql += character
      continue
    }

    if (valueIndex >= values.length) {
      throw new Error('A consulta D1 contém mais parâmetros que valores vinculados.')
    }
    const value = values[valueIndex]
    valueIndex += 1
    if (value === null) {
      sql += 'NULL'
    } else if (typeof value === 'string') {
      params.push(value)
      sql += '?'
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      params.push(String(value))
      sql += '?'
    } else if (typeof value === 'boolean') {
      params.push(value ? '1' : '0')
      sql += '?'
    } else {
      throw new Error('A consulta D1 contém um parâmetro com tipo não suportado pela API Cloudflare.')
    }
  }

  if (valueIndex !== values.length) {
    throw new Error('A consulta D1 contém mais valores vinculados que parâmetros.')
  }
  return { sql, params }
}

function getEnvironment(event: H3Event): Record<string, unknown> {
  const workerEnv: unknown = event.context.cloudflare?.env
  if (isRecord(workerEnv)) return workerEnv
  return typeof process === 'undefined' ? {} : process.env
}

function queryError(response: D1RestResponse, status: number): Error {
  const detail = response.errors?.find(error => typeof error.message === 'string')?.message
  return new Error(detail
    ? `Cloudflare D1 API (${status}): ${detail}`
    : `Cloudflare D1 API respondeu com HTTP ${status}.`)
}

function mapD1Result<T>(result: D1RestResult): D1Result<T> {
  if (result.success !== true || !Array.isArray(result.results)) {
    throw new Error('Cloudflare D1 API retornou um resultado inválido.')
  }

  const meta = result.meta ?? {}
  return {
    success: true,
    results: result.results as T[],
    meta: {
      duration: meta.duration ?? 0,
      size_after: meta.size_after ?? 0,
      rows_read: meta.rows_read ?? 0,
      rows_written: meta.rows_written ?? 0,
      last_row_id: meta.last_row_id ?? 0,
      changed_db: meta.changed_db ?? false,
      changes: meta.changes ?? 0,
      ...(meta.served_by_region ? { served_by_region: meta.served_by_region } : {}),
      ...(meta.served_by_colo ? { served_by_colo: meta.served_by_colo } : {}),
      ...(meta.served_by_primary !== undefined ? { served_by_primary: meta.served_by_primary } : {}),
      ...(meta.timings ? { timings: meta.timings } : {}),
    },
  }
}

class CloudflareApiStatement {
  private values: unknown[] = []

  constructor(
    private readonly sql: string,
    private readonly execute: (queries: D1RestQuery[]) => Promise<D1RestResult[]>,
  ) {}

  bind(...values: unknown[]): this {
    this.values = values
    return this
  }

  private async result<T>(): Promise<D1Result<T>> {
    const [result] = await this.execute([this.toQuery()])
    if (!result) throw new Error('Cloudflare D1 API não retornou o resultado da consulta.')
    return mapD1Result<T>(result)
  }

  async all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    return this.result<T>()
  }

  async run<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    return this.result<T>()
  }

  async first<T = Record<string, unknown>>(columnName?: string): Promise<T | null> {
    const result = await this.result<Record<string, unknown>>()
    const row = result.results[0]
    if (!row) return null
    return (columnName ? row[columnName] : row) as T
  }

  toQuery(): D1RestQuery {
    return escaparParametrosParaApi(this.sql, this.values)
  }
}

export function createCloudflareApiDatabase(
  accountId: string,
  databaseId: string,
  apiToken: string,
  fetcher: typeof fetch = fetch,
): D1Database {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/d1/database/${encodeURIComponent(databaseId)}/query`
  const execute = async (queries: D1RestQuery[]): Promise<D1RestResult[]> => {
    const isBatch = queries.length > 1
    const body = isBatch
      ? { batch: queries }
      : queries[0]
    const response = await fetcher(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const payload: unknown = await response.json()
    if (!isRecord(payload)) {
      throw new Error('Cloudflare D1 API retornou uma resposta inválida.')
    }
    const apiResponse = payload as D1RestResponse
    if (!response.ok || apiResponse.success !== true || !Array.isArray(apiResponse.result)) {
      throw queryError(apiResponse, response.status)
    }
    if (apiResponse.result.some(result => result.success !== true)) {
      throw queryError(apiResponse, response.status)
    }
    return apiResponse.result
  }

  const database = {
    prepare(sql: string) {
      return new CloudflareApiStatement(sql, execute) as unknown as D1PreparedStatement
    },
    async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
      const queries = statements.map((statement) => {
        if (!(statement instanceof CloudflareApiStatement)) {
          throw new Error('A operação em lote contém uma instrução que não pertence a esta conexão D1.')
        }
        return statement.toQuery()
      })
      if (!queries.length) return []
      const results = await execute(queries)
      if (results.length !== queries.length) {
        throw new Error('Cloudflare D1 API retornou uma quantidade inesperada de resultados.')
      }
      return results.map(result => mapD1Result<T>(result))
    },
  }
  return database as unknown as D1Database
}

export function getDatabase(event: H3Event): D1Database {
  const env = getEnvironment(event)
  const database: unknown = env.DB
  if (isRecord(database) && 'prepare' in database && typeof database.prepare === 'function') {
    return database as unknown as D1Database
  }

  const readString = (key: string): string | undefined => (
    typeof env[key] === 'string' ? env[key] as string : undefined
  )
  const accountId = readString('CLOUDFLARE_ACCOUNT_ID')
  const databaseId = readString('CLOUDFLARE_D1_DATABASE_ID')
  const apiToken = readString('CLOUDFLARE_API_TOKEN')
  if (accountId && databaseId && apiToken) {
    return createCloudflareApiDatabase(accountId, databaseId, apiToken)
  }

  if (env.VERCEL === '1') {
    throw createError({
      statusCode: 503,
      statusMessage: 'O acesso ao banco não está configurado na Vercel. Configure as variáveis CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID e CLOUDFLARE_API_TOKEN.',
    })
  }

  throw createError({
    statusCode: 503,
    statusMessage: 'O banco D1 não está disponível. Confira a configuração do Cloudflare.',
  })
}

export function getWorkerEnv(event: H3Event): WorkerRuntimeEnv {
  const env = getEnvironment(event)
  const stringValue = (key: string): string | undefined => {
    const value = env[key]
    return typeof value === 'string' ? value : undefined
  }
  return {
    SESSION_SECRET: stringValue('SESSION_SECRET'),
    RESEND_API_KEY: stringValue('RESEND_API_KEY'),
    APP_URL: stringValue('APP_URL'),
    EMAIL_FROM: stringValue('EMAIL_FROM'),
    CLOUDFLARE_ACCOUNT_ID: stringValue('CLOUDFLARE_ACCOUNT_ID'),
    CLOUDFLARE_D1_DATABASE_ID: stringValue('CLOUDFLARE_D1_DATABASE_ID'),
    CLOUDFLARE_API_TOKEN: stringValue('CLOUDFLARE_API_TOKEN'),
  }
}
