import { exigirGerenciarCodigos } from '../../utils/codigos'
import { lerFormularioMultipart, lerJsonMultipart, obterUploadDocx } from '../../utils/importacao-docx'
import { confirmarImportacao } from '../../utils/importacoes'

export default defineEventHandler(async (event) => {
  const usuario = await exigirGerenciarCodigos(event)
  const partes = await lerFormularioMultipart(event)
  const upload = obterUploadDocx(partes)
  const payload = lerJsonMultipart(partes, 'payload')
  const resultado = await confirmarImportacao(event, payload, upload.nomeArquivo, upload.bytes, usuario)
  setResponseStatus(event, 201)
  return resultado
})
