import { listarTestesOcorrencia } from '@backend/services/ocorrencia-testes'
import { obterUsuario } from '../../../../utils/auth'
import { getDatabase } from '../../../../utils/database'

export default defineEventHandler(async (event) => {
  await obterUsuario(event)
  const ocorrenciaId = getRouterParam(event, 'id')
  if (!ocorrenciaId || !/^[0-9a-f-]{36}$/i.test(ocorrenciaId)) {
    throw createError({ statusCode: 400, statusMessage: 'O identificador da ocorrência é inválido.' })
  }
  const resultado = await listarTestesOcorrencia(getDatabase(event), ocorrenciaId)
  if (!resultado) throw createError({ statusCode: 404, statusMessage: 'Ocorrência não encontrada.' })
  return resultado
})
