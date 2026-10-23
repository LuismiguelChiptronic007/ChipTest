import { idCodigoSchema } from '@backend/schemas/codigos'
import { buscarCodigo, listarHistoricoCodigo } from '@backend/services/codigos'
import { exigirLeituraCodigos } from '../../../utils/codigos'
import { getDatabase } from '../../../utils/database'

export default defineEventHandler(async (event) => {
  await exigirLeituraCodigos(event)
  const id = idCodigoSchema.safeParse(getRouterParam(event, 'id'))
  if (!id.success) {
    throw createError({ statusCode: 400, statusMessage: 'O código solicitado é inválido.' })
  }

  const db = getDatabase(event)
  if (!await buscarCodigo(db, id.data)) {
    throw createError({ statusCode: 404, statusMessage: 'Código não encontrado.' })
  }
  return { alteracoes: await listarHistoricoCodigo(db, id.data) }
})
