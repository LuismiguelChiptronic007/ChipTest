import { atualizarItensLoteSchema, idTesteSchema } from '@backend/schemas/testes'
import { atualizarItensTeste, buscarTeste } from '@backend/services/testes'
import { exigirEdicaoTeste } from '../../../../utils/testes'
import { obterUsuario } from '../../../../utils/auth'
import { getDatabase } from '../../../../utils/database'

export default defineEventHandler(async (event) => {
  const usuario = await obterUsuario(event)
  const id = idTesteSchema.safeParse(getRouterParam(event, 'id'))
  if (!id.success) throw createError({ statusCode: 400, statusMessage: id.error.issues[0]?.message })
  const entrada = atualizarItensLoteSchema.safeParse(await readBody(event))
  if (!entrada.success) {
    throw createError({ statusCode: 400, statusMessage: entrada.error.issues[0]?.message ?? 'Confira os itens selecionados.' })
  }
  const db = getDatabase(event)
  const dados = await buscarTeste(db, id.data)
  if (!dados) throw createError({ statusCode: 404, statusMessage: 'Teste não encontrado.' })
  await exigirEdicaoTeste(event, dados.teste)
  await atualizarItensTeste(
    db,
    id.data,
    entrada.data.itens.map(({ id: itemId }: { id: string }) => ({
      id: itemId,
      resultado: entrada.data.resultado,
      observacao: null,
    })),
    usuario.id,
    dados.teste.status !== 'em_andamento',
  )
  return { sucesso: true, atualizados: entrada.data.itens.length }
})
