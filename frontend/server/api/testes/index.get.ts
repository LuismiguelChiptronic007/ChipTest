import { statusTesteSchema } from '@backend/schemas/testes'
import { listarTestes } from '@backend/services/testes'
import { obterUsuario } from '../../utils/auth'
import { getDatabase } from '../../utils/database'

export default defineEventHandler(async (event) => {
  await obterUsuario(event)
  const query = getQuery(event)
  const status = typeof query.status === 'string' && query.status !== 'todos'
    ? statusTesteSchema.safeParse(query.status)
    : null
  if (status && !status.success) {
    throw createError({ statusCode: 400, statusMessage: 'O filtro de status de teste é inválido.' })
  }
  return { testes: await listarTestes(getDatabase(event), status?.data) }
})
