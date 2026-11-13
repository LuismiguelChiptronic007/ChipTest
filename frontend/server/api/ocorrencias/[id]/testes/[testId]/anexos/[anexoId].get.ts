import { obterTesteOcorrencia } from '@backend/services/ocorrencia-testes'
import { streamArquivoD1 } from '../../../../../../utils/arquivos-d1'
import { obterUsuario } from '../../../../../../utils/auth'
import { getDatabase } from '../../../../../../utils/database'

export default defineEventHandler(async (event) => {
  await obterUsuario(event)
  const ocorrenciaId = getRouterParam(event, 'id')
  const testeId = getRouterParam(event, 'testId')
  const anexoId = getRouterParam(event, 'anexoId')
  if (
    !ocorrenciaId || !/^[0-9a-f-]{36}$/i.test(ocorrenciaId)
    || !testeId || !/^[0-9a-f-]{36}$/i.test(testeId)
    || !anexoId || !/^[0-9a-f-]{36}$/i.test(anexoId)
  ) {
    throw createError({ statusCode: 400, statusMessage: 'Os identificadores do arquivo são inválidos.' })
  }
  const db = getDatabase(event)
  const [teste, anexo] = await Promise.all([
    obterTesteOcorrencia(db, ocorrenciaId, testeId),
    db.prepare(
      `SELECT file_path, file_name, tipo_mime, tamanho_bytes, total_partes
       FROM ocorrencia_teste_anexos
       WHERE id = ? AND test_id = ? AND status_upload = 'pronto'`,
    ).bind(anexoId, testeId).first<{
      file_path: string
      file_name: string
      tipo_mime: string
      tamanho_bytes: number
      total_partes: number
    }>(),
  ])
  if (!teste || !anexo) throw createError({ statusCode: 404, statusMessage: 'O teste ou arquivo não foi encontrado.' })
  const nomeCodificado = encodeURIComponent(anexo.file_name).replaceAll("'", '%27')
  setHeader(event, 'Content-Type', anexo.tipo_mime)
  setHeader(event, 'Content-Length', anexo.tamanho_bytes)
  setHeader(event, 'Content-Disposition', `inline; filename*=UTF-8''${nomeCodificado}`)
  setHeader(event, 'Cache-Control', 'private, no-store')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  return new Response(streamArquivoD1(db, anexo.file_path, anexo.total_partes))
})
