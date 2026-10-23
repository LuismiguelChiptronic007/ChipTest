import { exigirLeituraCodigos } from '../../utils/codigos'
import { getDatabase } from '../../utils/database'
import { resumoImportacaoSchema } from '@backend/schemas/importacoes'

interface ImportacaoRow {
  id: string
  codigo_id: string
  codigo: string
  marca: string
  modelo: string
  nome_arquivo: string
  usuario_id: string | null
  usuario_nome: string | null
  resumo: string
  status: 'concluida' | 'falhou'
  criado_em: string
}

function normalizarResumo(resumoJson: string) {
  const resumo: unknown = JSON.parse(resumoJson)
  const validado = resumoImportacaoSchema.safeParse(resumo)
  return validado.success
    ? validado.data
    : { novos: [], removidos: [], inalterados: [], ignoradas: [], legado: true as const }
}

export default defineEventHandler(async (event) => {
  await exigirLeituraCodigos(event)
  const resultado = await getDatabase(event).prepare(
    `SELECT i.id, i.codigo_id, c.codigo, c.marca, c.modelo, i.nome_arquivo,
      i.usuario_id, u.nome AS usuario_nome, i.resumo, i.status, i.criado_em
     FROM importacoes i
     JOIN codigos c ON c.id = i.codigo_id
     LEFT JOIN usuarios u ON u.id = i.usuario_id
     ORDER BY i.criado_em DESC, i.id DESC
     LIMIT 100`,
  ).all<ImportacaoRow>()

  return {
    importacoes: (resultado.results ?? []).map(item => ({
      ...item,
      resumo: normalizarResumo(item.resumo),
    })),
  }
})
