import { exigirGerenciarCodigos } from '../../utils/codigos'
import { analisarDocx, lerUploadDocx } from '../../utils/importacao-docx'

export default defineEventHandler(async (event) => {
  await exigirGerenciarCodigos(event)
  const upload = await lerUploadDocx(event)
  const resultado = await analisarDocx(upload)
  if (resultado.secoes.length === 0) {
    throw createError({
      statusCode: 422,
      statusMessage: 'O documento não contém títulos reconhecidos nem conteúdo para revisão. Confira se o arquivo possui seções.',
    })
  }
  return resultado
})
