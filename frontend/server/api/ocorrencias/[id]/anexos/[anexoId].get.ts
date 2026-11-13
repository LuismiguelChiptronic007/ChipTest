import { streamArquivoD1 } from '../../../../utils/arquivos-d1'
import { obterUsuario } from '../../../../utils/auth'
import { getDatabase } from '../../../../utils/database'

export default defineEventHandler(async (event) => {
  await obterUsuario(event)
  const ocorrenciaId = getRouterParam(event, 'id')
  const anexoId = getRouterParam(event, 'anexoId')
  if (
    !ocorrenciaId || !/^[0-9a-f-]{36}$/i.test(ocorrenciaId)
    || !anexoId || !/^[0-9a-f-]{36}$/i.test(anexoId)
  ) {
    throw createError({ statusCode: 400, statusMessage: 'O identificador do anexo é inválido.' })
  }
  const db = getDatabase(event)
  const anexo = await db.prepare(
    `SELECT chave_storage, nome_original, tipo_mime, tamanho_bytes, total_partes
     FROM anexos WHERE id = ? AND ocorrencia_id = ? AND status_upload = 'pronto'`,
  ).bind(anexoId, ocorrenciaId).first<{
    chave_storage: string
    nome_original: string
    tipo_mime: string
    tamanho_bytes: number
    total_partes: number
  }>()
  if (!anexo) throw createError({ statusCode: 404, statusMessage: 'O anexo não foi encontrado.' })
  const nomeCodificado = encodeURIComponent(anexo.nome_original).replaceAll("'", '%27')
  setHeader(event, 'Content-Type', anexo.tipo_mime)
  setHeader(event, 'Content-Length', anexo.tamanho_bytes)
  setHeader(event, 'Content-Disposition', `inline; filename*=UTF-8''${nomeCodificado}`)
  setHeader(event, 'Cache-Control', 'private, no-store')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  return new Response(streamArquivoD1(db, anexo.chave_storage, anexo.total_partes))
})
