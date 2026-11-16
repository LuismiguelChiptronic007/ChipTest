import { idCodigoSchema } from '@backend/schemas/codigos'
import { exigirLeituraCodigos } from '../../../utils/codigos'
import { getDatabase } from '../../../utils/database'

interface CodigoItemRow {
  id: string
  tipo_secao: string
  nome_completo: string
  nome_original: string
  nome_pt: string | null
  ordem: number
  versao: number
  importacao_id: string | null
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
    `SELECT id, tipo_secao, nome_completo, nome_original, nome_pt, ordem, versao,
       importacao_id, atualizado_em
     FROM codigo_itens
     WHERE codigo_id = ? AND ativo = 1
     ORDER BY tipo_secao, ordem, id`,
  ).bind(codigoId.data).all<CodigoItemRow>()
  return { itens: resultado.results ?? [] }
})
