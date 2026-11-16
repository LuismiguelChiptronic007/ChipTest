import { deleteCookie, getCookie, getRequestURL } from 'h3'
import { verifySession } from '@backend/services/crypto'
import { COOKIE_SESSAO } from '../../utils/auth'
import { getDatabase, getWorkerEnv } from '../../utils/database'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, COOKIE_SESSAO)
  const secret = getWorkerEnv(event).SESSION_SECRET

  if (token && secret && secret.length >= 32) {
    const sessao = await verifySession(token, secret)
    if (sessao) {
      await getDatabase(event)
        .prepare('UPDATE usuarios SET versao_sessao = versao_sessao + 1 WHERE id = ? AND versao_sessao = ?')
        .bind(sessao.sub, sessao.sv)
        .run()
    }
  }

  deleteCookie(event, COOKIE_SESSAO, { httpOnly: true, secure: getRequestURL(event).protocol === 'https:', sameSite: 'lax', path: '/' })
  return { sucesso: true }
})
