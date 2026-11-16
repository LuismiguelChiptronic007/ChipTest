import { loginSchema } from '@backend/schemas/auth'
import { signSession, verifyPassword } from '@backend/services/crypto'
import { configurarCookieSessao } from '../../utils/auth'
import { getDatabase, getWorkerEnv } from '../../utils/database'

interface LoginRow {
  id: string
  senha_hash: string
  versao_sessao: number
}

export default defineEventHandler(async (event) => {
  const resultado = loginSchema.safeParse(await readBody(event))
  if (!resultado.success) {
    throw createError({
      statusCode: 400,
      statusMessage: resultado.error.issues[0]?.message ?? 'Confira os dados informados.',
    })
  }

  const usuario = await getDatabase(event)
    .prepare('SELECT id, senha_hash, versao_sessao FROM usuarios WHERE email = ? COLLATE NOCASE')
    .bind(resultado.data.email)
    .first<LoginRow>()

  const senhaValida = usuario
    ? await verifyPassword(resultado.data.senha, usuario.senha_hash)
    : await verifyPassword(resultado.data.senha, 'pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')

  if (!usuario || !senhaValida) {
    throw createError({ statusCode: 401, statusMessage: 'E-mail ou senha inválidos.' })
  }

  const secret = getWorkerEnv(event).SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw createError({ statusCode: 503, statusMessage: 'A chave de sessão do servidor não está configurada.' })
  }

  const token = await signSession(usuario.id, usuario.versao_sessao, secret)
  configurarCookieSessao(event, token)
  return { sucesso: true }
})
