import { atualizarLoadFunctionSchema } from '@backend/schemas/load-overview'
import { atualizarFuncaoCarga } from '@backend/services/load-overview'
import { exigirGerenciarCodigos } from '../../../../../utils/codigos'
import { getDatabase } from '../../../../../utils/database'
import { obterCodigoId, obterFuncaoId } from '../../../../../utils/load-overview'

export default defineEventHandler(async (event) => {
  await exigirGerenciarCodigos(event)
  const entrada = atualizarLoadFunctionSchema.safeParse(await readBody(event))
  if (!entrada.success) {
    throw createError({ statusCode: 400, statusMessage: entrada.error.issues[0]?.message ?? 'Confira a função.' })
  }
  const atualizado = await atualizarFuncaoCarga(
    getDatabase(event),
    obterCodigoId(event),
    obterFuncaoId(event),
    entrada.data,
  )
  if (!atualizado) throw createError({ statusCode: 404, statusMessage: 'Função não encontrada.' })
  return { sucesso: true }
})
