import { Buffer } from 'node:buffer'
import mammoth from 'mammoth'
import sanitizeHtml from 'sanitize-html'
import { getHeader, readMultipartFormData } from 'h3'
import type { H3Event } from 'h3'
import { extrairCodigoDoNomeArquivo, listarTiposSecao, separarSecoes } from '@backend/services/importacoes'

export const TAMANHO_MAXIMO_DOCX = 10 * 1024 * 1024
const TAMANHO_MAXIMO_FORMULARIO = TAMANHO_MAXIMO_DOCX + 2 * 1024 * 1024

export interface UploadDocx {
  nomeArquivo: string
  bytes: Uint8Array
}

export interface CampoMultipart {
  name?: string
  filename?: string
  data: Uint8Array
}

const opcoesSanitizacao: sanitizeHtml.IOptions = {
  allowedTags: [
    'a', 'b', 'blockquote', 'br', 'caption', 'code', 'div', 'em', 'h1', 'h2', 'h3',
    'h4', 'hr', 'i', 'li', 'ol', 'p', 'pre', 'span', 'strong', 'sub', 'sup', 'table',
    'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'u', 'ul',
  ],
  allowedAttributes: {
    a: ['href', 'title'],
    p: ['class'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  disallowedTagsMode: 'discard',
  transformTags: {
    p: (tagName, attributes) => {
      const classe = attributes.class?.trim() ?? ''
      const attribs: Record<string, string> = /^(?:heading|title|t[ií]tulo)\s*[1-3]?$/i.test(classe)
        ? { class: classe }
        : {}
      return {
        tagName,
        attribs,
      }
    },
  },
}

export function sanitizarConteudoHtml(html: string): string {
  return sanitizeHtml(html, opcoesSanitizacao)
}

export async function hashArquivoDocx(bytes: Uint8Array): Promise<string> {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  const hash = await crypto.subtle.digest('SHA-256', buffer)
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function lerFormularioMultipart(event: H3Event): Promise<CampoMultipart[]> {
  const contentLength = Number(getHeader(event, 'content-length') ?? 0)
  if (contentLength > TAMANHO_MAXIMO_FORMULARIO) {
    throw createError({ statusCode: 413, statusMessage: 'O envio excede o limite de 10 MB para o documento Word.' })
  }
  return await readMultipartFormData(event) ?? []
}

export function obterUploadDocx(partes: CampoMultipart[]): UploadDocx {
  const arquivo = partes?.find(parte => parte.name === 'file' && parte.filename)
  if (!arquivo?.filename || !arquivo.data) {
    throw createError({ statusCode: 400, statusMessage: 'Selecione um arquivo .docx para continuar.' })
  }
  if (arquivo.data.byteLength > TAMANHO_MAXIMO_DOCX) {
    throw createError({ statusCode: 413, statusMessage: 'O arquivo deve ter no máximo 10 MB.' })
  }
  if (!arquivo.filename.toLocaleLowerCase('pt-BR').endsWith('.docx')) {
    throw createError({ statusCode: 400, statusMessage: 'Formato inválido. Envie somente documentos .docx.' })
  }
  if (arquivo.data[0] !== 0x50 || arquivo.data[1] !== 0x4b) {
    throw createError({ statusCode: 400, statusMessage: 'O arquivo enviado não é um documento Word válido.' })
  }

  return { nomeArquivo: arquivo.filename, bytes: arquivo.data }
}

export function lerJsonMultipart(partes: CampoMultipart[], nomeCampo: string): unknown {
  const parte = partes?.find(item => item.name === nomeCampo)
  if (!parte?.data || parte.filename) {
    throw createError({ statusCode: 400, statusMessage: 'Os dados da importação estão incompletos.' })
  }
  if (parte.data.byteLength > 2 * 1024 * 1024) {
    throw createError({ statusCode: 413, statusMessage: 'Os dados de revisão excedem o limite permitido. Reduza o conteúdo do documento e tente novamente.' })
  }
  try {
    return JSON.parse(new TextDecoder().decode(parte.data))
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Os dados enviados para a importação são inválidos.' })
  }
}

export async function lerUploadDocx(event: H3Event): Promise<UploadDocx> {
  return obterUploadDocx(await lerFormularioMultipart(event))
}

export async function analisarDocx(upload: UploadDocx) {
  let html: string
  try {
    const conversao = await mammoth.convertToHtml(
      { buffer: Buffer.from(upload.bytes) },
      {
        styleMap: [
          "p[style-name^='Heading 1'] => h1:fresh",
          "p[style-name^='Heading 2'] => h2:fresh",
          "p[style-name^='Heading 3'] => h3:fresh",
          "p[style-name^='Título 1'] => h1:fresh",
          "p[style-name^='Título 2'] => h2:fresh",
          "p[style-name^='Título 3'] => h3:fresh",
        ],
      },
    )
    html = sanitizarConteudoHtml(conversao.value)
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw createError({ statusCode: 400, statusMessage: 'Não foi possível ler o documento. O arquivo pode estar corrompido ou protegido.' })
    }
    throw error
  }

  const secoes = separarSecoes(html)
  if (html.length > 2 * 1024 * 1024) {
    throw createError({ statusCode: 413, statusMessage: 'O documento convertido excede o limite de conteúdo permitido.' })
  }
  const hashArquivo = await hashArquivoDocx(upload.bytes)
  const codigoSugerido = extrairCodigoDoNomeArquivo(upload.nomeArquivo)
  const reconhecidas = secoes.filter(secao => secao.tipoSecao !== null).length

  return {
    nomeArquivo: upload.nomeArquivo,
    hashArquivo,
    codigoSugerido,
    secoes,
    tiposSecao: listarTiposSecao(),
    aviso: reconhecidas === 0
      ? 'Nenhuma seção dentro do escopo foi reconhecida automaticamente. Atribua as seções manualmente; falhas permanecem fora do escopo.'
      : null,
  }
}
