import { idCodigoSchema } from '@backend/schemas/codigos'
import { listarTestesCodigo } from '@backend/services/testes'
import { exigirLeituraCodigos } from '../../../../utils/codigos'
import { getDatabase } from '../../../../utils/database'

export default defineEventHandler(async (event) => {
  await exigirLeituraCodigos(event)
  const codigoId = idCodigoSchema.safeParse(getRouterParam(event, 'id'))
  if (!codigoId.success) throw createError({ statusCode: 400, statusMessage: 'O código solicitado é inválido.' })
  const db = getDatabase(event)
  const codigo = await db.prepare(
    'SELECT id FROM codigos WHERE id = ? AND excluido_em IS NULL',
  ).bind(codigoId.data).first<{ id: string }>()
  if (!codigo) throw createError({ statusCode: 404, statusMessage: 'Código não encontrado.' })
  return listarTestesCodigo(db, codigoId.data)
})
