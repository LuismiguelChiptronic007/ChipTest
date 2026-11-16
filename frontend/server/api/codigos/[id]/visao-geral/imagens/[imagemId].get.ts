import { streamArquivoD1 } from '../../../../../utils/arquivos-d1'
import { obterUsuario } from '../../../../../utils/auth'
import { getDatabase } from '../../../../../utils/database'

export default defineEventHandler(async (event) => {
  await obterUsuario(event)
  const codigoId = getRouterParam(event, 'id')
  const imagemId = getRouterParam(event, 'imagemId')
  if (
    !codigoId || !/^[0-9a-f-]{36}$/i.test(codigoId)
    || !imagemId || !/^[0-9a-f-]{36}$/i.test(imagemId)
  ) {
    throw createError({ statusCode: 400, statusMessage: 'O identificador da imagem é inválido.' })
  }

  const db = getDatabase(event)
  const url = `/api/codigos/${codigoId}/visao-geral/imagens/${imagemId}`
  const imagem = await db.prepare(
    `SELECT i.chave_storage, i.tipo_mime, i.tamanho_bytes, i.total_partes
     FROM load_overview_images i
     JOIN load_overviews o ON o.id = i.overview_id
     WHERE i.id = ? AND i.codigo_id = ? AND (
       (i.field = 'sga_print_url' AND o.sga_print_url = ?)
       OR (i.field = 'system_info_url' AND o.system_info_url = ?)
     )`,
  ).bind(imagemId, codigoId, url, url).first<{
    chave_storage: string
    tipo_mime: string
    tamanho_bytes: number
    total_partes: number
  }>()
  if (!imagem) throw createError({ statusCode: 404, statusMessage: 'A imagem não foi encontrada.' })

  setHeader(event, 'Content-Type', imagem.tipo_mime)
  setHeader(event, 'Content-Length', imagem.tamanho_bytes)
  setHeader(event, 'Content-Disposition', 'inline')
  setHeader(event, 'Cache-Control', 'private, no-store')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  return new Response(streamArquivoD1(db, imagem.chave_storage, imagem.total_partes))
})
