import { criarTesteOcorrenciaSchema } from '@backend/schemas/ocorrencia-testes'
import { criarTesteOcorrencia } from '@backend/services/ocorrencia-testes'
import { obterUsuario } from '../../../../utils/auth'
import { getDatabase } from '../../../../utils/database'

export default defineEventHandler(async (event) => {
  const usuario = await obterUsuario(event)
  const ocorrenciaId = getRouterParam(event, 'id')
  if (!ocorrenciaId || !/^[0-9a-f-]{36}$/i.test(ocorrenciaId)) {
    throw createError({ statusCode: 400, statusMessage: 'O identificador da ocorrência é inválido.' })
  }
  const entrada = criarTesteOcorrenciaSchema.safeParse(await readBody(event))
  if (!entrada.success) {
    throw createError({
      statusCode: 400,
      statusMessage: entrada.error.issues[0]?.message ?? 'Confira os dados do teste.',
    })
  }
  const id = await criarTesteOcorrencia(getDatabase(event), ocorrenciaId, usuario, entrada.data)
  setResponseStatus(event, 201)
  return { id }
})
