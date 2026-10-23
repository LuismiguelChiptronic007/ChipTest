import { codigoSchema } from '@backend/schemas/codigos'
import { criarCodigo } from '@backend/services/codigos'
import { erroDeCodigo, exigirGerenciarCodigos } from '../../utils/codigos'
import { getDatabase } from '../../utils/database'

export default defineEventHandler(async (event) => {
  const usuario = await exigirGerenciarCodigos(event)
  const entrada = codigoSchema.safeParse(await readBody(event))
  if (!entrada.success) {
    throw createError({
      statusCode: 400,
      statusMessage: entrada.error.issues[0]?.message ?? 'Confira as informações do código.',
    })
  }

  try {
    const id = await criarCodigo(getDatabase(event), entrada.data, usuario.id)
    setResponseStatus(event, 201)
    return { id }
  } catch (error: unknown) {
    erroDeCodigo(error)
  }
})
