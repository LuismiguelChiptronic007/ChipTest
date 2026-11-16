import { papelPodeExcluirAnexo } from '@backend/services/ocorrencias'
import { excluirArquivoD1 } from '../../../../utils/arquivos-d1'
import { obterUsuario } from '../../../../utils/auth'
import { getDatabase } from '../../../../utils/database'

export default defineEventHandler(async (event) => {
  const usuario = await obterUsuario(event)
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
    `SELECT a.chave_storage, a.enviado_por, o.relatado_por
     FROM anexos a JOIN ocorrencias o ON o.id = a.ocorrencia_id
     WHERE a.id = ? AND a.ocorrencia_id = ?`,
  ).bind(anexoId, ocorrenciaId).first<{
    chave_storage: string
    enviado_por: string
    relatado_por: string
  }>()
  if (!anexo) throw createError({ statusCode: 404, statusMessage: 'Anexo não encontrado.' })
  if (!papelPodeExcluirAnexo(usuario.papel, usuario.id, anexo.relatado_por)) {
    throw createError({ statusCode: 403, statusMessage: 'Somente o relator, engenharia ou admin pode excluir este anexo.' })
  }
  await db.batch([
    db.prepare('DELETE FROM arquivo_partes WHERE chave_storage = ?').bind(anexo.chave_storage),
    db.prepare('DELETE FROM anexos WHERE id = ?').bind(anexoId),
  ])
  return { sucesso: true }
})
