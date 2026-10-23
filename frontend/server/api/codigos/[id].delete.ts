import { idCodigoSchema } from '@backend/schemas/codigos'
import { excluirCodigo } from '@backend/services/codigos'
import { exigirGerenciarCodigos } from '../../utils/codigos'
import { getDatabase } from '../../utils/database'

export default defineEventHandler(async (event) => {
  const usuario = await exigirGerenciarCodigos(event)
  const id = idCodigoSchema.safeParse(getRouterParam(event, 'id'))
  if (!id.success) {
    throw createError({ statusCode: 400, statusMessage: 'O código solicitado é inválido.' })
  }

  const excluido = await excluirCodigo(getDatabase(event), id.data, usuario.id)
  if (!excluido) {
    throw createError({ statusCode: 404, statusMessage: 'Código não encontrado.' })
  }
  return { sucesso: true }
})
