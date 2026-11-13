import { atualizarTesteOcorrenciaSchema } from '@backend/schemas/ocorrencia-testes'
import { atualizarTesteOcorrencia } from '@backend/services/ocorrencia-testes'
import { obterUsuario } from '../../../../utils/auth'
import { getDatabase } from '../../../../utils/database'

export default defineEventHandler(async (event) => {
  const usuario = await obterUsuario(event)
  const ocorrenciaId = getRouterParam(event, 'id')
  const testeId = getRouterParam(event, 'testId')
  if (
    !ocorrenciaId || !/^[0-9a-f-]{36}$/i.test(ocorrenciaId)
    || !testeId || !/^[0-9a-f-]{36}$/i.test(testeId)
  ) {
    throw createError({ statusCode: 400, statusMessage: 'Os identificadores do teste são inválidos.' })
  }
  const entrada = atualizarTesteOcorrenciaSchema.safeParse(await readBody(event))
  if (!entrada.success) {
    throw createError({
      statusCode: 400,
      statusMessage: entrada.error.issues[0]?.message ?? 'Confira os dados enviados.',
    })
  }
  const atualizada = await atualizarTesteOcorrencia(
    getDatabase(event),
    ocorrenciaId,
    testeId,
    usuario,
    entrada.data,
  )
  if (!atualizada) throw createError({ statusCode: 404, statusMessage: 'Teste não encontrado.' })
  return { sucesso: true }
})
