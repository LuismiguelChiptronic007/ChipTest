import { idCodigoSchema } from '@backend/schemas/codigos'
import { criarTesteSchema } from '@backend/schemas/testes'
import { criarTeste } from '@backend/services/testes'
import { exigirPermissaoTipoTeste } from '../../../../utils/testes'
import { exigirLeituraCodigos } from '../../../../utils/codigos'
import { getDatabase } from '../../../../utils/database'

export default defineEventHandler(async (event) => {
  const usuario = await exigirLeituraCodigos(event)
  const codigoId = idCodigoSchema.safeParse(getRouterParam(event, 'id'))
  if (!codigoId.success) throw createError({ statusCode: 400, statusMessage: 'O código solicitado é inválido.' })
  const entrada = criarTesteSchema.safeParse(await readBody(event))
  if (!entrada.success) {
    throw createError({ statusCode: 400, statusMessage: entrada.error.issues[0]?.message ?? 'Confira os dados do teste.' })
  }
  exigirPermissaoTipoTeste(usuario, entrada.data.tipo)
  try {
    const teste = await criarTeste(getDatabase(event), codigoId.data, entrada.data, usuario.id)
    setResponseStatus(event, 201)
    return teste
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed: testes.codigo_id, testes.tipo, testes.numero')) {
      throw createError({ statusCode: 409, statusMessage: 'Outro usuário iniciou um teste deste tipo ao mesmo tempo. Tente novamente.' })
    }
    throw error
  }
})
