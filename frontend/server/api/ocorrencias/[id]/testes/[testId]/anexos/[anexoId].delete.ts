import { papelPodeTestar } from '@backend/services/testes'
import { obterTesteOcorrencia } from '@backend/services/ocorrencia-testes'
import { obterUsuario } from '../../../../../../utils/auth'
import { getDatabase } from '../../../../../../utils/database'

export default defineEventHandler(async (event) => {
  const usuario = await obterUsuario(event)
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
      'SELECT file_path FROM ocorrencia_teste_anexos WHERE id = ? AND test_id = ?',
    ).bind(anexoId, testeId).first<{ file_path: string }>(),
  ])
  if (!teste || !anexo) throw createError({ statusCode: 404, statusMessage: 'O teste ou arquivo não foi encontrado.' })
  if (!papelPodeTestar(usuario.papel, teste.kind)) {
    throw createError({ statusCode: 403, statusMessage: 'Você não pode excluir arquivos deste teste.' })
  }
  await db.batch([
    db.prepare('DELETE FROM arquivo_partes WHERE chave_storage = ?').bind(anexo.file_path),
    db.prepare('DELETE FROM ocorrencia_teste_anexos WHERE id = ? AND test_id = ?').bind(anexoId, testeId),
  ])
  return { sucesso: true }
})
