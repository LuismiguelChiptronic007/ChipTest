import { idImportacaoSchema } from '@backend/schemas/importacoes'
import { exigirLeituraCodigos } from '../../../utils/codigos'
import { getDatabase, getImportacoesBucket } from '../../../utils/database'

interface ArquivoImportacao {
  arquivo_key: string
  nome_arquivo: string
}

export default defineEventHandler(async (event) => {
  await exigirLeituraCodigos(event)
  const id = idImportacaoSchema.safeParse(getRouterParam(event, 'id'))
  if (!id.success) throw createError({ statusCode: 400, statusMessage: 'A importação solicitada é inválida.' })

  const arquivo = await getDatabase(event).prepare(
    'SELECT arquivo_key, nome_arquivo FROM importacoes WHERE id = ?',
  ).bind(id.data).first<ArquivoImportacao>()
  if (!arquivo) throw createError({ statusCode: 404, statusMessage: 'O arquivo desta importação não foi encontrado.' })

  const objeto = await getImportacoesBucket(event).get(arquivo.arquivo_key)
  if (!objeto) throw createError({ statusCode: 404, statusMessage: 'O documento original não está disponível no armazenamento.' })

  const nomeSeguro = arquivo.nome_arquivo.replace(/[^\w.-]/g, '_').slice(0, 255) || 'documento.docx'
  setResponseHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="${nomeSeguro}"; filename*=UTF-8''${encodeURIComponent(arquivo.nome_arquivo)}`)
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  return objeto.body
})
