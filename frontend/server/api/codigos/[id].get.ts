import { idCodigoSchema } from '@backend/schemas/codigos'
import { buscarCodigo } from '@backend/services/codigos'
import { exigirLeituraCodigos } from '../../utils/codigos'
import { getDatabase } from '../../utils/database'

export default defineEventHandler(async (event) => {
  await exigirLeituraCodigos(event)
  const id = idCodigoSchema.safeParse(getRouterParam(event, 'id'))
  if (!id.success) {
    throw createError({ statusCode: 400, statusMessage: 'O código solicitado é inválido.' })
  }

  const codigo = await buscarCodigo(getDatabase(event), id.data)
  if (!codigo) {
    throw createError({ statusCode: 404, statusMessage: 'Código não encontrado.' })
  }
  return { codigo }
})
