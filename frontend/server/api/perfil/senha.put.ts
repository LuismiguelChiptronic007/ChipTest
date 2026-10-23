import { novaSenhaSchema } from '@backend/schemas/auth'
import { hashPassword, signSession } from '@backend/services/crypto'
import { configurarCookieSessao, obterUsuario } from '../../utils/auth'
import { getDatabase, getWorkerEnv } from '../../utils/database'

export default defineEventHandler(async (event) => {
  const usuario = await obterUsuario(event)
  const resultado = novaSenhaSchema.safeParse(await readBody(event))
  if (!resultado.success) {
    throw createError({
      statusCode: 400,
      statusMessage: resultado.error.issues[0]?.message ?? 'Confira os dados informados.',
    })
  }

  const senhaHash = await hashPassword(resultado.data.senha)
  const atualizado = await getDatabase(event).prepare(
    `UPDATE usuarios SET senha_hash = ?, versao_sessao = versao_sessao + 1,
     atualizado_em = datetime('now') WHERE id = ? RETURNING versao_sessao`,
  ).bind(senhaHash, usuario.id).first<{ versao_sessao: number }>()

  if (!atualizado) {
    throw createError({ statusCode: 500, statusMessage: 'Não foi possível atualizar a senha.' })
  }

  const secret = getWorkerEnv(event).SESSION_SECRET
  if (!secret) {
    throw createError({ statusCode: 503, statusMessage: 'A chave de sessão do servidor não está configurada.' })
  }
  configurarCookieSessao(event, await signSession(usuario.id, atualizado.versao_sessao, secret))
  return { sucesso: true }
})
