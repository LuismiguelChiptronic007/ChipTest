import { criarOcorrenciaSchema } from '@backend/schemas/ocorrencias'
import { criarOcorrencia } from '@backend/services/ocorrencias'
import { obterUsuario } from '../../utils/auth'
import { getDatabase } from '../../utils/database'

export default defineEventHandler(async (event) => {
  const usuario = await obterUsuario(event)
  const entrada = criarOcorrenciaSchema.safeParse(await readBody(event))
  if (!entrada.success) {
    throw createError({
      statusCode: 400,
      statusMessage: entrada.error.issues[0]?.message ?? 'Confira os dados da ocorrência.',
    })
  }
  const id = await criarOcorrencia(getDatabase(event), entrada.data, usuario.id)
  setResponseStatus(event, 201)
  return { id }
})
