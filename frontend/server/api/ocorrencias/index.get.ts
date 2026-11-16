import { listagemOcorrenciasSchema } from '@backend/schemas/ocorrencias'
import { listarOcorrencias } from '@backend/services/ocorrencias'
import { obterUsuario } from '../../utils/auth'
import { getDatabase } from '../../utils/database'

export default defineEventHandler(async (event) => {
  await obterUsuario(event)
  const filtros = listagemOcorrenciasSchema.safeParse(getQuery(event))
  if (!filtros.success) {
    throw createError({
      statusCode: 400,
      statusMessage: filtros.error.issues[0]?.message ?? 'Os filtros de ocorrências são inválidos.',
    })
  }
  return listarOcorrencias(getDatabase(event), filtros.data)
})
