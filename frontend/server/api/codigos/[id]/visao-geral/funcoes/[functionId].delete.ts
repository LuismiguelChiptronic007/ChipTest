import { excluirFuncaoCarga } from '@backend/services/load-overview'
import { exigirGerenciarCodigos } from '../../../../../utils/codigos'
import { getDatabase } from '../../../../../utils/database'
import { obterCodigoId, obterFuncaoId } from '../../../../../utils/load-overview'

export default defineEventHandler(async (event) => {
  await exigirGerenciarCodigos(event)
  const excluida = await excluirFuncaoCarga(
    getDatabase(event),
    obterCodigoId(event),
    obterFuncaoId(event),
  )
  if (!excluida) throw createError({ statusCode: 404, statusMessage: 'Função não encontrada.' })
  return { sucesso: true }
})
