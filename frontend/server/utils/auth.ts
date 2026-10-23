import { deleteCookie, getCookie, getRequestURL, setCookie } from 'h3'
import type { H3Event } from 'h3'
import type { Papel } from '~/types/auth'
import { verifySession } from '@backend/services/crypto'
import { getDatabase, getWorkerEnv } from './database'

export const COOKIE_SESSAO = 'chiptest_session'
export const DURACAO_SESSAO_SEGUNDOS = 60 * 60 * 24 * 7

export interface UsuarioAutenticado {
  id: string
  nome: string
  email: string
  setor_id: string
  setor: string
  papel: Papel
  ativo: boolean
  versao_sessao: number
}

export function configurarCookieSessao(event: H3Event, token: string): void {
  const secure = getRequestURL(event).protocol === 'https:'
  setCookie(event, COOKIE_SESSAO, token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: DURACAO_SESSAO_SEGUNDOS,
  })
}

export function limparCookieSessao(event: H3Event): void {
  const secure = getRequestURL(event).protocol === 'https:'
  deleteCookie(event, COOKIE_SESSAO, { httpOnly: true, secure, sameSite: 'lax', path: '/' })
}

export async function obterUsuario(event: H3Event, exigirAtivo = true): Promise<UsuarioAutenticado> {
  const token = getCookie(event, COOKIE_SESSAO)
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Sua sessão expirou. Entre novamente.' })
  }

  const env = getWorkerEnv(event)
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) {
    throw createError({ statusCode: 503, statusMessage: 'A chave de sessão do servidor não está configurada.' })
  }

  const sessao = await verifySession(token, env.SESSION_SECRET)
  if (!sessao) {
    limparCookieSessao(event)
    throw createError({ statusCode: 401, statusMessage: 'Sua sessão expirou. Entre novamente.' })
  }

  const usuario = await getDatabase(event)
    .prepare(
      `SELECT u.id, u.nome, u.email, u.setor_id, s.nome AS setor, u.papel, u.ativo, u.versao_sessao
       FROM usuarios u JOIN setores s ON s.id = u.setor_id WHERE u.id = ?`,
    )
    .bind(sessao.sub)
    .first<Omit<UsuarioAutenticado, 'ativo'> & { ativo: number }>()

  if (!usuario || usuario.versao_sessao !== sessao.sv) {
    limparCookieSessao(event)
    throw createError({ statusCode: 401, statusMessage: 'Sua sessão expirou. Entre novamente.' })
  }
  if (exigirAtivo && usuario.ativo !== 1) {
    throw createError({ statusCode: 403, statusMessage: 'Sua conta está aguardando liberação do administrador.' })
  }

  return { ...usuario, ativo: usuario.ativo === 1 }
}

export async function exigirAdministrador(event: H3Event): Promise<UsuarioAutenticado> {
  const usuario = await obterUsuario(event)
  if (usuario.papel !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Acesso permitido somente para administradores.' })
  }
  return usuario
}
