import { codigoSchema, idCodigoSchema } from '@backend/schemas/codigos'
import { editarCodigo } from '@backend/services/codigos'
import { erroDeCodigo, exigirGerenciarCodigos } from '../../utils/codigos'
import { getDatabase } from '../../utils/database'

export default defineEventHandler(async (event) => {
  const usuario = await exigirGerenciarCodigos(event)
  const id = idCodigoSchema.safeParse(getRouterParam(event, 'id'))
  if (!id.success) {
    throw createError({ statusCode: 400, statusMessage: 'O código solicitado é inválido.' })
  }
  const entrada = codigoSchema.safeParse(await readBody(event))
  if (!entrada.success) {
    throw createError({
      statusCode: 400,
      statusMessage: entrada.error.issues[0]?.message ?? 'Confira as informações do código.',
    })
  }

  try {
    const atualizado = await editarCodigo(getDatabase(event), id.data, entrada.data, usuario.id)
    if (!atualizado) {
      throw createError({ statusCode: 404, statusMessage: 'Código não encontrado.' })
    }
    return { sucesso: true }
  } catch (error: unknown) {
    erroDeCodigo(error)
  }
})
