import { exclusaoLoteSchema } from '@backend/schemas/codigos'
import { excluirCodigos } from '@backend/services/codigos'
import { exigirGerenciarCodigos } from '../../../utils/codigos'
import { getDatabase } from '../../../utils/database'

export default defineEventHandler(async (event) => {
  const usuario = await exigirGerenciarCodigos(event)
  const entrada = exclusaoLoteSchema.safeParse(await readBody(event))
  if (!entrada.success) {
    throw createError({
      statusCode: 400,
      statusMessage: entrada.error.issues[0]?.message ?? 'A seleção de códigos é inválida.',
    })
  }

  const excluidos = await excluirCodigos(getDatabase(event), entrada.data.ids, usuario.id)
  return { excluidos }
})
