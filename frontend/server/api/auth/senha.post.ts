import { redefinirSenhaSchema } from '@backend/schemas/auth'
import { hashPassword, hashResetToken } from '@backend/services/crypto'
import { getDatabase } from '../../utils/database'

export default defineEventHandler(async (event) => {
  const resultado = redefinirSenhaSchema.safeParse(await readBody(event))
  if (!resultado.success) {
    throw createError({
      statusCode: 400,
      statusMessage: resultado.error.issues[0]?.message ?? 'Confira os dados informados.',
    })
  }

  const db = getDatabase(event)
  const tokenHash = await hashResetToken(resultado.data.token)
  const usuario = await db.prepare(
    `SELECT id FROM usuarios
     WHERE token_redefinicao_hash = ? AND token_redefinicao_expira_em > ?`,
  ).bind(tokenHash, Math.floor(Date.now() / 1000)).first<{ id: string }>()

  if (!usuario) {
    throw createError({ statusCode: 400, statusMessage: 'O link expirou ou já foi utilizado. Solicite uma nova redefinição.' })
  }

  const senhaHash = await hashPassword(resultado.data.senha)
  const atualizado = await db.prepare(
    `UPDATE usuarios SET senha_hash = ?, token_redefinicao_hash = NULL,
     token_redefinicao_expira_em = NULL, versao_sessao = versao_sessao + 1,
     atualizado_em = datetime('now')
     WHERE id = ? AND token_redefinicao_hash = ? AND token_redefinicao_expira_em > ?`,
  ).bind(senhaHash, usuario.id, tokenHash, Math.floor(Date.now() / 1000)).run()

  if (atualizado.meta.changes !== 1) {
    throw createError({ statusCode: 409, statusMessage: 'O link já foi utilizado. Solicite uma nova redefinição.' })
  }
  return { sucesso: true }
})
