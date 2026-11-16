import { listagemCodigosSchema } from '@backend/schemas/codigos'
import { listarCodigos } from '@backend/services/codigos'
import { exigirLeituraCodigos } from '../../utils/codigos'
import { getDatabase } from '../../utils/database'

export default defineEventHandler(async (event) => {
  await exigirLeituraCodigos(event)
  const parametros = listagemCodigosSchema.safeParse(getQuery(event))
  if (!parametros.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parametros.error.issues[0]?.message ?? 'Os filtros de códigos são inválidos.',
    })
  }
  return listarCodigos(getDatabase(event), parametros.data)
})
