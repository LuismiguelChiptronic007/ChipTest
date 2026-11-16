import { atualizarTesteSchema, idTesteSchema } from '@backend/schemas/testes'
import { atualizarMetadadosTeste, buscarTeste } from '@backend/services/testes'
import { exigirEdicaoTeste } from '../../utils/testes'
import { obterUsuario } from '../../utils/auth'
import { getDatabase } from '../../utils/database'

export default defineEventHandler(async (event) => {
  const usuario = await obterUsuario(event)
  const id = idTesteSchema.safeParse(getRouterParam(event, 'id'))
  if (!id.success) throw createError({ statusCode: 400, statusMessage: id.error.issues[0]?.message })
  const entrada = atualizarTesteSchema.safeParse(await readBody(event))
  if (!entrada.success) {
    throw createError({ statusCode: 400, statusMessage: entrada.error.issues[0]?.message ?? 'Confira as informações do teste.' })
  }
  const db = getDatabase(event)
  const dados = await buscarTeste(db, id.data)
  if (!dados) throw createError({ statusCode: 404, statusMessage: 'Teste não encontrado.' })
  await exigirEdicaoTeste(event, dados.teste)
  const atualizado = await atualizarMetadadosTeste(db, id.data, entrada.data, usuario.id, usuario.papel === 'admin')
  if (!atualizado) throw createError({ statusCode: 409, statusMessage: 'O teste foi alterado por outra pessoa. Atualize a página.' })
  return { sucesso: true }
})
