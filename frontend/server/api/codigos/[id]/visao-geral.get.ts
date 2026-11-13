import { obterVisaoGeralCarga } from '@backend/services/load-overview'
import { obterUsuario } from '../../../utils/auth'
import { getDatabase } from '../../../utils/database'
import { obterCodigoId } from '../../../utils/load-overview'

export default defineEventHandler(async (event) => {
  await obterUsuario(event)
  const resultado = await obterVisaoGeralCarga(getDatabase(event), obterCodigoId(event))
  if (!resultado) throw createError({ statusCode: 404, statusMessage: 'Visão geral ou DSD não encontrada.' })
  return resultado
})
