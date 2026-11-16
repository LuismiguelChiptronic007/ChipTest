import { excluirTesteOcorrencia } from '@backend/services/ocorrencia-testes'
import { obterUsuario } from '../../../../utils/auth'
import { getDatabase } from '../../../../utils/database'

export default defineEventHandler(async (event) => {
  const usuario = await obterUsuario(event)
  const ocorrenciaId = getRouterParam(event, 'id')
  const testeId = getRouterParam(event, 'testId')
  if (
    !ocorrenciaId || !/^[0-9a-f-]{36}$/i.test(ocorrenciaId)
    || !testeId || !/^[0-9a-f-]{36}$/i.test(testeId)
  ) {
    throw createError({ statusCode: 400, statusMessage: 'Os identificadores do teste são inválidos.' })
  }
  const removido = await excluirTesteOcorrencia(getDatabase(event), ocorrenciaId, testeId, usuario)
  if (!removido) throw createError({ statusCode: 404, statusMessage: 'Teste não encontrado.' })
  return { sucesso: true }
})
