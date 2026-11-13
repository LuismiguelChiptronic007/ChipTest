import { criarLoadFunctionSchema } from '@backend/schemas/load-overview'
import { criarFuncaoCarga } from '@backend/services/load-overview'
import { exigirGerenciarCodigos } from '../../../../../utils/codigos'
import { getDatabase } from '../../../../../utils/database'
import { obterCodigoId } from '../../../../../utils/load-overview'

export default defineEventHandler(async (event) => {
  await exigirGerenciarCodigos(event)
  const entrada = criarLoadFunctionSchema.safeParse(await readBody(event))
  if (!entrada.success) {
    throw createError({ statusCode: 400, statusMessage: entrada.error.issues[0]?.message ?? 'Confira a função.' })
  }
  const id = await criarFuncaoCarga(getDatabase(event), obterCodigoId(event), entrada.data)
  if (!id) throw createError({ statusCode: 404, statusMessage: 'DSD não encontrada.' })
  setResponseStatus(event, 201)
  return { id }
})
