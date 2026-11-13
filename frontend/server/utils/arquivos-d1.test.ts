import { Buffer } from 'node:buffer'
import { describe, expect, it } from 'vitest'
import { lerArquivoD1, gravarArquivoD1, validarConteudoAnexo } from './arquivos-d1'
import { TAMANHO_PARTE_ANEXO_BYTES } from '@backend/services/ocorrencias-config'

describe('armazenamento de arquivos em partes no D1', () => {
  it('reconstrói um arquivo após dividi-lo em linhas menores que o limite de uma linha D1', async () => {
    const conteudos = new Map<number, string>()
    const database = {
      prepare(sql: string) {
        let values: unknown[] = []
        return {
          bind(...args: unknown[]) {
            values = args
            return this
          },
          async run() {
            const [, parte, conteudo] = values
            conteudos.set(parte as number, conteudo as string)
            return { success: true, results: [], meta: { changes: 1 } }
          },
          async all() {
            return {
              results: [...conteudos.entries()]
                .sort(([a], [b]) => a - b)
                .map(([numero_parte, conteudo_base64]) => ({ numero_parte, conteudo_base64 })),
            }
          },
        }
      },
    } as unknown as D1Database
    const original = new Uint8Array(TAMANHO_PARTE_ANEXO_BYTES + 23)
    for (let index = 0; index < original.length; index += 1) original[index] = index % 251

    const totalPartes = await gravarArquivoD1(database, 'storage-key', original)
    const reconstruido = await lerArquivoD1(database, 'storage-key')

    expect(totalPartes).toBe(2)
    expect(reconstruido).not.toBeNull()
    expect(Buffer.compare(Buffer.from(reconstruido!), Buffer.from(original))).toBe(0)
  })
})

describe('validação do conteúdo real dos anexos', () => {
  it('aceita assinaturas reconhecidas e rejeita extensão que mascara outro conteúdo', () => {
    expect(validarConteudoAnexo('foto.png', 'image/png', new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]))).toBe(true)
    expect(validarConteudoAnexo('foto.jpg', 'image/jpeg', new Uint8Array([0xff, 0xd8, 0xff]))).toBe(true)
    expect(validarConteudoAnexo('foto.webp', 'image/webp', new TextEncoder().encode('RIFF1234WEBP'))).toBe(true)
    expect(validarConteudoAnexo('arquivo.pdf', 'application/pdf', new TextEncoder().encode('%PDF-1.7'))).toBe(true)
    expect(validarConteudoAnexo('video.mp4', 'video/mp4', new TextEncoder().encode('0000ftypisom'))).toBe(true)
    expect(validarConteudoAnexo('arquivo.txt', 'text/plain', new TextEncoder().encode('log válido\n'))).toBe(true)
    expect(validarConteudoAnexo('script.png', 'image/png', new TextEncoder().encode('<script>'))).toBe(false)
    expect(validarConteudoAnexo('dados.log', 'text/plain', new Uint8Array([0x41, 0x00, 0x42]))).toBe(false)
  })
})
