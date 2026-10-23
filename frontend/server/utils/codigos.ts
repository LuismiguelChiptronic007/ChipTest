import type { H3Event } from 'h3'
import { obterUsuario, type UsuarioAutenticado } from './auth'

export async function exigirLeituraCodigos(event: H3Event): Promise<UsuarioAutenticado> {
  return obterUsuario(event)
}

export async function exigirGerenciarCodigos(event: H3Event): Promise<UsuarioAutenticado> {
  const usuario = await obterUsuario(event)
  if (usuario.papel !== 'admin' && usuario.papel !== 'engenharia') {
    throw createError({ statusCode: 403, statusMessage: 'Seu perfil permite consultar códigos, mas não alterá-los.' })
  }
  return usuario
}

export function erroDeCodigo(error: unknown): never {
  if (error instanceof Error && error.message.includes('UNIQUE constraint failed: codigos.codigo')) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Este código já está cadastrado. Informe um código diferente.',
    })
  }
  throw error
}
