import { idCodigoSchema } from '@backend/schemas/codigos'
import { duplicarCodigo } from '@backend/services/codigos'
import { erroDeCodigo, exigirGerenciarCodigos } from '../../../utils/codigos'
import { getDatabase } from '../../../utils/database'

export default defineEventHandler(async (event) => {
  const usuario = await exigirGerenciarCodigos(event)
  const id = idCodigoSchema.safeParse(getRouterParam(event, 'id'))
  if (!id.success) {
    throw createError({ statusCode: 400, statusMessage: 'O código solicitado é inválido.' })
  }

  try {
    const novoId = await duplicarCodigo(getDatabase(event), id.data, usuario.id)
    if (!novoId) {
      throw createError({ statusCode: 404, statusMessage: 'Código não encontrado.' })
    }
    setResponseStatus(event, 201)
    return { id: novoId }
  } catch (error: unknown) {
    erroDeCodigo(error)
  }
})
