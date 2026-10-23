import { finalizarTesteSchema, idTesteSchema } from '@backend/schemas/testes'
import { buscarTeste, finalizarTeste } from '@backend/services/testes'
import { exigirEdicaoTeste } from '../../../utils/testes'
import { obterUsuario } from '../../../utils/auth'
import { getDatabase } from '../../../utils/database'

export default defineEventHandler(async (event) => {
  const usuario = await obterUsuario(event)
  const id = idTesteSchema.safeParse(getRouterParam(event, 'id'))
  if (!id.success) throw createError({ statusCode: 400, statusMessage: id.error.issues[0]?.message })
  const entrada = finalizarTesteSchema.safeParse(await readBody(event))
  if (!entrada.success) {
    throw createError({ statusCode: 400, statusMessage: entrada.error.issues[0]?.message ?? 'Selecione um status final.' })
  }
  const db = getDatabase(event)
  const dados = await buscarTeste(db, id.data)
  if (!dados) throw createError({ statusCode: 404, statusMessage: 'Teste não encontrado.' })
  await exigirEdicaoTeste(event, dados.teste)
  const atualizado = await finalizarTeste(db, id.data, entrada.data.status, usuario.id, usuario.papel === 'admin')
  if (!atualizado) throw createError({ statusCode: 409, statusMessage: 'O teste foi alterado por outra pessoa. Atualize a página.' })
  return { sucesso: true }
})
