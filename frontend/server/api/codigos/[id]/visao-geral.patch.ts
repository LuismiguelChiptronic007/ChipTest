import { atualizarLoadOverviewSchema } from '@backend/schemas/load-overview'
import { atualizarVisaoGeralCarga } from '@backend/services/load-overview'
import { exigirGerenciarCodigos } from '../../../utils/codigos'
import { getDatabase } from '../../../utils/database'
import { obterCodigoId } from '../../../utils/load-overview'

export default defineEventHandler(async (event) => {
  await exigirGerenciarCodigos(event)
  const codigoId = obterCodigoId(event)
  const entrada = atualizarLoadOverviewSchema.safeParse(await readBody(event))
  if (!entrada.success) {
    throw createError({
      statusCode: 400,
      statusMessage: entrada.error.issues[0]?.message ?? 'Confira os dados da visão geral.',
    })
  }
  const atualizado = await atualizarVisaoGeralCarga(getDatabase(event), codigoId, entrada.data)
  if (!atualizado) throw createError({ statusCode: 404, statusMessage: 'DSD não encontrada.' })
  return { sucesso: true }
})
