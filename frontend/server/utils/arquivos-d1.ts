import { Buffer } from 'node:buffer'
import type { TipoMimeAnexo } from '@backend/services/ocorrencias-config'
import { TAMANHO_PARTE_ANEXO_BYTES } from '@backend/services/ocorrencias-config'

export interface ParteArquivo {
  numero_parte: number
  conteudo_base64: string
}

function bytesParaBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64')
}

function base64ParaBytes(value: string): Uint8Array {
  if (value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
    throw new Error('Base64 inválido.')
  }
  const bytes = Buffer.from(value, 'base64')
  if (bytes.toString('base64') !== value) throw new Error('Base64 inválido.')
  return new Uint8Array(bytes)
}

export function gerarChaveStorage(): string {
  return crypto.randomUUID()
}

export async function gravarArquivoD1(
  db: D1Database,
  chaveStorage: string,
  bytes: Uint8Array,
): Promise<number> {
  const totalPartes = Math.ceil(bytes.byteLength / TAMANHO_PARTE_ANEXO_BYTES)
  try {
    for (let numeroParte = 0; numeroParte < totalPartes; numeroParte += 1) {
      const inicio = numeroParte * TAMANHO_PARTE_ANEXO_BYTES
      const parte = bytes.subarray(inicio, Math.min(inicio + TAMANHO_PARTE_ANEXO_BYTES, bytes.byteLength))
      await gravarParteArquivoD1(db, chaveStorage, numeroParte, bytesParaBase64(parte))
    }
  } catch (error: unknown) {
    await excluirArquivoD1(db, chaveStorage)
    throw error
  }
  return totalPartes
}

export async function gravarParteArquivoD1(
  db: D1Database,
  chaveStorage: string,
  numeroParte: number,
  conteudoBase64: string,
): Promise<void> {
  await db.prepare(
    `INSERT INTO arquivo_partes (chave_storage, numero_parte, conteudo_base64)
     VALUES (?, ?, ?)
     ON CONFLICT(chave_storage, numero_parte)
     DO UPDATE SET conteudo_base64 = excluded.conteudo_base64`,
  ).bind(chaveStorage, numeroParte, conteudoBase64).run()
}

export async function lerArquivoD1(db: D1Database, chaveStorage: string): Promise<Uint8Array | null> {
  const resultado = await db.prepare(
    `SELECT numero_parte, conteudo_base64 FROM arquivo_partes
     WHERE chave_storage = ? ORDER BY numero_parte`,
  ).bind(chaveStorage).all<ParteArquivo>()
  if (!resultado.results.length) return null

  const partes = resultado.results
  const tamanhoTotal = partes.reduce((total, parte) => {
    const padding = parte.conteudo_base64.endsWith('==') ? 2 : parte.conteudo_base64.endsWith('=') ? 1 : 0
    return total + Math.floor(parte.conteudo_base64.length * 3 / 4) - padding
  }, 0)
  const arquivo = new Uint8Array(tamanhoTotal)
  let cursor = 0
  for (const parte of partes) {
    const bytes = base64ParaBytes(parte.conteudo_base64)
    arquivo.set(bytes, cursor)
    cursor += bytes.byteLength
  }
  return arquivo.subarray(0, cursor)
}

export async function validarTextoArquivoD1(
  db: D1Database,
  chaveStorage: string,
  totalPartes: number,
): Promise<boolean> {
  const decoder = new TextDecoder('utf-8', { fatal: true })
  try {
    for (let numeroParte = 0; numeroParte < totalPartes; numeroParte += 1) {
      const parte = await db.prepare(
        `SELECT conteudo_base64 FROM arquivo_partes
         WHERE chave_storage = ? AND numero_parte = ?`,
      ).bind(chaveStorage, numeroParte).first<{ conteudo_base64: string }>()
      if (!parte) return false
      const bytes = base64ParaBytes(parte.conteudo_base64)
      if (bytes.includes(0) || !bytes.every(byte => byte >= 0x20 || [0x09, 0x0a, 0x0d].includes(byte))) {
        return false
      }
      decoder.decode(bytes, { stream: numeroParte < totalPartes - 1 })
    }
    decoder.decode()
    return true
  } catch {
    return false
  }
}

export function streamArquivoD1(
  db: D1Database,
  chaveStorage: string,
  totalPartes: number,
): ReadableStream<Uint8Array> {
  let numeroParte = 0
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (numeroParte >= totalPartes) {
        controller.close()
        return
      }
      const parte = await db.prepare(
        `SELECT conteudo_base64 FROM arquivo_partes
         WHERE chave_storage = ? AND numero_parte = ?`,
      ).bind(chaveStorage, numeroParte).first<{ conteudo_base64: string }>()
      if (!parte) throw new Error('O arquivo armazenado está incompleto.')
      controller.enqueue(base64ParaBytes(parte.conteudo_base64))
      numeroParte += 1
    },
  })
}

export async function excluirArquivoD1(db: D1Database, chaveStorage: string): Promise<void> {
  await db.prepare('DELETE FROM arquivo_partes WHERE chave_storage = ?').bind(chaveStorage).run()
}

function textoAscii(bytes: Uint8Array, inicio: number, fim: number): string {
  return String.fromCharCode(...bytes.subarray(inicio, fim))
}

export function validarConteudoAnexo(
  nomeOriginal: string,
  tipoMime: TipoMimeAnexo,
  bytes: Uint8Array,
): boolean {
  const nome = nomeOriginal.toLocaleLowerCase('pt-BR')
  const extensaoValida: Record<TipoMimeAnexo, boolean> = {
    'image/png': nome.endsWith('.png'),
    'image/jpeg': nome.endsWith('.jpg') || nome.endsWith('.jpeg'),
    'image/webp': nome.endsWith('.webp'),
    'application/pdf': nome.endsWith('.pdf'),
    'video/mp4': nome.endsWith('.mp4'),
    'text/plain': nome.endsWith('.txt') || nome.endsWith('.log'),
  }
  if (!extensaoValida[tipoMime]) return false

  if (tipoMime === 'image/png') {
    return bytes.byteLength >= 8
      && bytes[0] === 0x89
      && textoAscii(bytes, 1, 4) === 'PNG'
      && bytes[4] === 0x0d
      && bytes[5] === 0x0a
      && bytes[6] === 0x1a
      && bytes[7] === 0x0a
  }
  if (tipoMime === 'image/jpeg') {
    return bytes.byteLength >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  }
  if (tipoMime === 'image/webp') {
    return bytes.byteLength >= 12
      && textoAscii(bytes, 0, 4) === 'RIFF'
      && textoAscii(bytes, 8, 12) === 'WEBP'
  }
  if (tipoMime === 'application/pdf') {
    return bytes.byteLength >= 5 && textoAscii(bytes, 0, 5) === '%PDF-'
  }
  if (tipoMime === 'video/mp4') {
    return bytes.byteLength >= 12 && textoAscii(bytes, 4, 8) === 'ftyp'
  }
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    return !bytes.includes(0) && bytes.every(byte => byte >= 0x20 || [0x09, 0x0a, 0x0d].includes(byte))
  } catch {
    return false
  }
}

export function decodificarParteAnexo(conteudoBase64: string): Uint8Array {
  try {
    return base64ParaBytes(conteudoBase64)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'A parte do arquivo está codificada em formato inválido.' })
  }
}
