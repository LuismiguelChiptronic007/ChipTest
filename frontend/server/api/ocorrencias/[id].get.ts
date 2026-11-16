import { buscarOcorrencia } from '@backend/services/ocorrencias'
import { obterUsuario } from '../../utils/auth'
import { getDatabase } from '../../utils/database'

export default defineEventHandler(async (event) => {
  const usuario = await obterUsuario(event)
  const id = getRouterParam(event, 'id')
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'O identificador da ocorrência é inválido.' })
  }
  const detalhe = await buscarOcorrencia(getDatabase(event), id, usuario.id)
  if (!detalhe) throw createError({ statusCode: 404, statusMessage: 'Ocorrência não encontrada.' })
  return detalhe
})
