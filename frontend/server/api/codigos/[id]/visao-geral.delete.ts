import { excluirVisaoGeralCarga } from '@backend/services/load-overview'
import { exigirGerenciarCodigos } from '../../../utils/codigos'
import { getDatabase } from '../../../utils/database'
import { obterCodigoId } from '../../../utils/load-overview'

export default defineEventHandler(async (event) => {
  await exigirGerenciarCodigos(event)
  const excluida = await excluirVisaoGeralCarga(getDatabase(event), obterCodigoId(event))
  if (!excluida) throw createError({ statusCode: 404, statusMessage: 'Visão geral não encontrada.' })
  return { sucesso: true }
})
