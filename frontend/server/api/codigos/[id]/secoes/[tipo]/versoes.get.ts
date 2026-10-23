import { idCodigoSchema } from '@backend/schemas/codigos'
import { tipoSecaoImportacaoSchema } from '@backend/schemas/importacoes'
import { exigirLeituraCodigos } from '../../../../../utils/codigos'
import { getDatabase } from '../../../../../utils/database'

interface VersaoRow {
  versao: number
  conteudo: string
  atualizado_em: string
  criado_em: string
  ativa: boolean
}

export default defineEventHandler(async (event) => {
  await exigirLeituraCodigos(event)
  const codigoId = idCodigoSchema.safeParse(getRouterParam(event, 'id'))
  const tipoSecao = tipoSecaoImportacaoSchema.safeParse(getRouterParam(event, 'tipo'))
  if (!codigoId.success || !tipoSecao.success) {
    throw createError({ statusCode: 400, statusMessage: 'Os dados da seção solicitada são inválidos.' })
  }

  const resultado = await getDatabase(event).prepare(
    `SELECT versao, conteudo, atualizado_em, atualizado_em AS criado_em, 1 AS ativa
     FROM codigo_secoes WHERE codigo_id = ? AND tipo_secao = ?
     UNION ALL
     SELECT v.versao, v.conteudo, v.atualizado_em, v.criado_em, 0 AS ativa
     FROM codigo_secoes_versoes v
     JOIN codigo_secoes s ON s.id = v.codigo_secao_id
     WHERE s.codigo_id = ? AND s.tipo_secao = ?
     ORDER BY versao DESC`,
  ).bind(codigoId.data, tipoSecao.data, codigoId.data, tipoSecao.data).all<VersaoRow>()
  return {
    versoes: (resultado.results ?? []).map(item => ({ ...item, ativa: Boolean(item.ativa) })),
  }
})
