import { emailSchema } from '@backend/schemas/auth'
import { createResetToken, hashResetToken } from '@backend/services/crypto'
import { getDatabase, getWorkerEnv } from '../../utils/database'

export default defineEventHandler(async (event) => {
  const resultado = emailSchema.safeParse(await readBody(event))
  if (!resultado.success) {
    throw createError({
      statusCode: 400,
      statusMessage: resultado.error.issues[0]?.message ?? 'Informe um e-mail válido.',
    })
  }

  const env = getWorkerEnv(event)
  if (!env.RESEND_API_KEY) {
    throw createError({ statusCode: 503, statusMessage: 'A recuperação de senha por e-mail ainda não está configurada.' })
  }

  const db = getDatabase(event)
  const usuario = await db.prepare('SELECT id, email FROM usuarios WHERE email = ? COLLATE NOCASE')
    .bind(resultado.data.email)
    .first<{ id: string; email: string }>()

  if (usuario) {
    const token = createResetToken()
    const tokenHash = await hashResetToken(token)
    const expiracao = Math.floor(Date.now() / 1000) + 60 * 60
    await db.prepare(
      'UPDATE usuarios SET token_redefinicao_hash = ?, token_redefinicao_expira_em = ?, atualizado_em = datetime(\'now\') WHERE id = ?',
    ).bind(tokenHash, expiracao, usuario.id).run()

    const url = new URL('/redefinir-senha', env.APP_URL || 'http://localhost:3000')
    url.searchParams.set('token', token)
    const resposta = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM || 'ChipTest <onboarding@resend.dev>',
        to: [usuario.email],
        subject: 'Redefinir sua senha do ChipTest',
        html: `<p>Recebemos uma solicitação para redefinir sua senha do ChipTest.</p><p><a href="${url.toString()}">Definir nova senha</a></p><p>O link expira em uma hora. Se você não solicitou a redefinição, ignore esta mensagem.</p>`,
        text: `Acesse ${url.toString()} para definir uma nova senha. O link expira em uma hora.`,
      }),
    })

    if (!resposta.ok) {
      await db.prepare(
        'UPDATE usuarios SET token_redefinicao_hash = NULL, token_redefinicao_expira_em = NULL WHERE id = ? AND token_redefinicao_hash = ?',
      ).bind(usuario.id, tokenHash).run()
      throw createError({ statusCode: 502, statusMessage: 'Não foi possível enviar o e-mail de redefinição. Tente novamente.' })
    }
  }

  return { sucesso: true, mensagem: 'Se o e-mail estiver cadastrado, você receberá um link de redefinição.' }
})
