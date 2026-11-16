import { idCodigoSchema } from '@backend/schemas/codigos'
import { sugerirNumeroTeste } from '@backend/services/testes'
import { exigirLeituraCodigos } from '../../../../utils/codigos'
import { getDatabase } from '../../../../utils/database'
import { listarResponsaveis as carregarResponsaveis } from '@backend/services/testes'

export default defineEventHandler(async (event) => {
  const usuario = await exigirLeituraCodigos(event)
  const codigoId = idCodigoSchema.safeParse(getRouterParam(event, 'id'))
  if (!codigoId.success) throw createError({ statusCode: 400, statusMessage: 'O código solicitado é inválido.' })
  const db = getDatabase(event)
  const codigo = await db.prepare(
    'SELECT id, codigo, marca, modelo FROM codigos WHERE id = ? AND excluido_em IS NULL',
  ).bind(codigoId.data).first<{ id: string; codigo: string; marca: string; modelo: string }>()
  if (!codigo) throw createError({ statusCode: 404, statusMessage: 'Código não encontrado.' })

  const [bancada, campo, responsaveis] = await Promise.all([
    sugerirNumeroTeste(db, codigoId.data, 'bancada'),
    sugerirNumeroTeste(db, codigoId.data, 'campo'),
    carregarResponsaveis(db),
  ])
  return { codigo, sugestoes: { bancada, campo }, responsaveis, responsavelPadrao: usuario.id }
})
