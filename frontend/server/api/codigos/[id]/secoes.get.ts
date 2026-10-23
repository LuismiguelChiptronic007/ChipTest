import { idCodigoSchema } from '@backend/schemas/codigos'
import { exigirLeituraCodigos } from '../../../utils/codigos'
import { getDatabase } from '../../../utils/database'

interface SecaoRow {
  id: string
  tipo_secao: string
  conteudo: string
  versao: number
  atualizado_em: string
}

export default defineEventHandler(async (event) => {
  await exigirLeituraCodigos(event)
  const codigoId = idCodigoSchema.safeParse(getRouterParam(event, 'id'))
  if (!codigoId.success) throw createError({ statusCode: 400, statusMessage: 'O código solicitado é inválido.' })

  const db = getDatabase(event)
  const codigo = await db.prepare(
    'SELECT id FROM codigos WHERE id = ? AND excluido_em IS NULL',
  ).bind(codigoId.data).first<{ id: string }>()
  if (!codigo) throw createError({ statusCode: 404, statusMessage: 'Código não encontrado.' })

  const resultado = await db.prepare(
    `SELECT id, tipo_secao, conteudo, versao, atualizado_em
     FROM codigo_secoes WHERE codigo_id = ? ORDER BY tipo_secao`,
  ).bind(codigoId.data).all<SecaoRow>()
  return { secoes: resultado.results ?? [] }
})
