import type { H3Event } from 'h3'
import type { UsuarioAutenticado } from './auth'
import { obterUsuario } from './auth'
import type { TesteRecord } from '@backend/services/testes'
import { papelPodeEditarTeste, papelPodeTestar } from '@backend/services/testes'

export function exigirPermissaoTipoTeste(usuario: UsuarioAutenticado, tipo: TesteRecord['tipo']): void {
  if (!papelPodeTestar(usuario.papel, tipo)) {
    throw createError({
      statusCode: 403,
      statusMessage: tipo === 'bancada'
        ? 'Seu perfil não pode criar ou editar testes de bancada.'
        : 'Seu perfil não pode criar ou editar testes de campo.',
    })
  }
}

export async function exigirEdicaoTeste(event: H3Event, teste: TesteRecord): Promise<UsuarioAutenticado> {
  const usuario = await obterUsuario(event)
  exigirPermissaoTipoTeste(usuario, teste.tipo)
  if (!papelPodeEditarTeste(usuario.papel, teste.tipo, teste.status)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Este teste já foi finalizado. Somente um administrador pode alterá-lo.',
    })
  }
  return usuario
}
