import { obterUsuario } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const usuario = await obterUsuario(event, false)
  return {
    usuario: { id: usuario.id, email: usuario.email },
    perfil: {
      id: usuario.id,
      nome: usuario.nome,
      setor_id: usuario.setor_id,
      setor: usuario.setor,
      papel: usuario.papel,
      ativo: usuario.ativo,
    },
  }
})
