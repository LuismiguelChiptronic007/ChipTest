import { atualizarOcorrenciaSchema } from '@backend/schemas/ocorrencias'
import { atualizarOcorrencia } from '@backend/services/ocorrencias'
import { obterUsuario } from '../../utils/auth'
import { getDatabase } from '../../utils/database'

export default defineEventHandler(async (event) => {
  const usuario = await obterUsuario(event)
  const id = getRouterParam(event, 'id')
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'O identificador da ocorrência é inválido.' })
  }
  const entrada = atualizarOcorrenciaSchema.safeParse(await readBody(event))
  if (!entrada.success) {
    throw createError({
      statusCode: 400,
      statusMessage: entrada.error.issues[0]?.message ?? 'Confira os dados enviados.',
    })
  }
  const atualizada = await atualizarOcorrencia(getDatabase(event), id, usuario, entrada.data)
  if (!atualizada) throw createError({ statusCode: 404, statusMessage: 'Ocorrência não encontrada.' })
  return { sucesso: true }
})
