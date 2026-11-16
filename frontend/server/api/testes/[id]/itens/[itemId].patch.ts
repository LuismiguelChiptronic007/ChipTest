import { atualizarItemTesteSchema, idTesteSchema } from '@backend/schemas/testes'
import { atualizarItensTeste, buscarTeste } from '@backend/services/testes'
import { exigirEdicaoTeste } from '../../../../utils/testes'
import { obterUsuario } from '../../../../utils/auth'
import { getDatabase } from '../../../../utils/database'

export default defineEventHandler(async (event) => {
  const usuario = await obterUsuario(event)
  const id = idTesteSchema.safeParse(getRouterParam(event, 'id'))
  const itemId = idTesteSchema.safeParse(getRouterParam(event, 'itemId'))
  if (!id.success || !itemId.success) throw createError({ statusCode: 400, statusMessage: 'O teste ou item solicitado é inválido.' })
  const entrada = atualizarItemTesteSchema.safeParse(await readBody(event))
  if (!entrada.success) {
    throw createError({ statusCode: 400, statusMessage: entrada.error.issues[0]?.message ?? 'Confira o resultado do item.' })
  }
  const db = getDatabase(event)
  const dados = await buscarTeste(db, id.data)
  if (!dados) throw createError({ statusCode: 404, statusMessage: 'Teste não encontrado.' })
  await exigirEdicaoTeste(event, dados.teste)
  await atualizarItensTeste(db, id.data, [{ id: itemId.data, ...entrada.data }], usuario.id, dados.teste.status !== 'em_andamento')
  return { sucesso: true }
})
