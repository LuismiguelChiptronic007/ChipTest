import { idTesteSchema } from '@backend/schemas/testes'
import { buscarTeste } from '@backend/services/testes'
import { obterUsuario } from '../../utils/auth'
import { getDatabase } from '../../utils/database'

export default defineEventHandler(async (event) => {
  await obterUsuario(event)
  const id = idTesteSchema.safeParse(getRouterParam(event, 'id'))
  if (!id.success) throw createError({ statusCode: 400, statusMessage: id.error.issues[0]?.message })
  const dados = await buscarTeste(getDatabase(event), id.data)
  if (!dados) throw createError({ statusCode: 404, statusMessage: 'Teste não encontrado.' })
  return dados
})
