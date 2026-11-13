import { chavesDocumento, atualizarDocumentoLoadSchema } from '@backend/schemas/load-overview'
import { atualizarDocumentoVisaoGeral } from '@backend/services/load-overview'
import { exigirGerenciarCodigos } from '../../../../../utils/codigos'
import { getDatabase } from '../../../../../utils/database'
import { obterCodigoId } from '../../../../../utils/load-overview'

export default defineEventHandler(async (event) => {
  await exigirGerenciarCodigos(event)
  const codigoId = obterCodigoId(event)
  const key = getRouterParam(event, 'key')
  if (!key || !chavesDocumento.includes(key as (typeof chavesDocumento)[number])) {
    throw createError({ statusCode: 400, statusMessage: 'O documento selecionado é inválido.' })
  }
  const entrada = atualizarDocumentoLoadSchema.safeParse(await readBody(event))
  if (!entrada.success) {
    throw createError({ statusCode: 400, statusMessage: 'Informe se a documentação está presente.' })
  }
  const atualizado = await atualizarDocumentoVisaoGeral(
    getDatabase(event),
    codigoId,
    key as (typeof chavesDocumento)[number],
    entrada.data.checked,
  )
  if (!atualizado) throw createError({ statusCode: 404, statusMessage: 'Documento ou DSD não encontrado.' })
  return { sucesso: true }
})
