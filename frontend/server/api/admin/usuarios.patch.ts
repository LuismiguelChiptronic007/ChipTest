import { atualizarUsuarioSchema } from '@backend/schemas/auth'
import { exigirAdministrador } from '../../utils/auth'
import { getDatabase } from '../../utils/database'

export default defineEventHandler(async (event) => {
  const administrador = await exigirAdministrador(event)
  const resultado = atualizarUsuarioSchema.safeParse(await readBody(event))
  if (!resultado.success) {
    throw createError({
      statusCode: 400,
      statusMessage: resultado.error.issues[0]?.message ?? 'Confira os dados informados.',
    })
  }

  const { id, papel, ativo } = resultado.data
  if (id === administrador.id) {
    throw createError({ statusCode: 400, statusMessage: 'Não é possível alterar seu próprio acesso.' })
  }
  const campos: string[] = []
  const valores: (string | number)[] = []
  if (papel !== undefined) {
    campos.push('papel = ?')
    valores.push(papel)
  }
  if (ativo !== undefined) {
    campos.push('ativo = ?')
    valores.push(ativo ? 1 : 0)
  }
  campos.push("atualizado_em = datetime('now')")

  const atualizado = await getDatabase(event).prepare(
    `UPDATE usuarios SET ${campos.join(', ')} WHERE id = ? AND id <> ?`,
  ).bind(...valores, id, administrador.id).run()

  if (atualizado.meta.changes !== 1) {
    throw createError({ statusCode: 404, statusMessage: 'Usuário não encontrado ou não pode ser alterado.' })
  }
  return { sucesso: true }
})
