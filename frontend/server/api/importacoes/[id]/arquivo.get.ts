import { streamArquivoD1 } from '../../../utils/arquivos-d1'
import { obterUsuario } from '../../../utils/auth'
import { getDatabase } from '../../../utils/database'

export default defineEventHandler(async (event) => {
  await obterUsuario(event)
  const id = getRouterParam(event, 'id')
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'O identificador da importação é inválido.' })
  }
  const db = getDatabase(event)
  const importacao = await db.prepare(
    'SELECT nome_arquivo, arquivo_key FROM importacoes WHERE id = ?',
  ).bind(id).first<{ nome_arquivo: string; arquivo_key: string | null }>()
  if (!importacao) throw createError({ statusCode: 404, statusMessage: 'Importação não encontrada.' })
  if (!importacao.arquivo_key) {
    throw createError({ statusCode: 404, statusMessage: 'O documento original desta importação não foi armazenado.' })
  }
  const partes = await db.prepare(
    'SELECT COUNT(*) AS total FROM arquivo_partes WHERE chave_storage = ?',
  ).bind(importacao.arquivo_key).first<{ total: number }>()
  if (!partes?.total) throw createError({ statusCode: 500, statusMessage: 'O documento original está indisponível.' })
  setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  setHeader(event, 'Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(importacao.nome_arquivo)}`)
  setHeader(event, 'Cache-Control', 'private, no-store')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  return new Response(streamArquivoD1(db, importacao.arquivo_key, partes.total))
})
