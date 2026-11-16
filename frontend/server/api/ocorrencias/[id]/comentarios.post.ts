import { comentarioOcorrenciaSchema } from '@backend/schemas/ocorrencias'
import { adicionarComentario } from '@backend/services/ocorrencias'
import { obterUsuario } from '../../../utils/auth'
import { getDatabase } from '../../../utils/database'

export default defineEventHandler(async (event) => {
  const usuario = await obterUsuario(event)
  const ocorrenciaId = getRouterParam(event, 'id')
  if (!ocorrenciaId || !/^[0-9a-f-]{36}$/i.test(ocorrenciaId)) {
    throw createError({ statusCode: 400, statusMessage: 'O identificador da ocorrência é inválido.' })
  }
  const entrada = comentarioOcorrenciaSchema.safeParse(await readBody(event))
  if (!entrada.success) {
    throw createError({
      statusCode: 400,
      statusMessage: entrada.error.issues[0]?.message ?? 'Confira o comentário.',
    })
  }
  const id = await adicionarComentario(getDatabase(event), ocorrenciaId, usuario.id, entrada.data.texto)
  setResponseStatus(event, 201)
  return { id }
})
