import { codigoSchema } from '@backend/schemas/codigos'
import { criarImportacaoSchema, type TipoSecaoImportacao } from '@backend/schemas/importacoes'
import {
  compararItensPorOcorrencia,
  separarNomeItem,
} from '@backend/services/importacoes'
import type { ItemPersistidoParaComparar, ItemParaComparar } from '@backend/services/importacoes'
import type { ZodError } from 'zod'
import type { H3Event } from 'h3'
import type { UsuarioAutenticado } from './auth'
import { getDatabase } from './database'
import { hashArquivoDocx } from './importacao-docx'

type ItemAtual = ItemPersistidoParaComparar

interface ItemPersistido {
  id: string
  tipo_secao: TipoSecaoImportacao
  nome_completo: string
  nome_original: string
  nome_pt: string | null
  ordem: number
  versao: number
  importacao_id: string
}

interface ItemResumo {
  tipo_secao: TipoSecaoImportacao
  nome_completo: string
  ocorrencia: number
}

export interface ResumoImportacao {
  novos: ItemResumo[]
  removidos: ItemResumo[]
  inalterados: ItemResumo[]
  ignoradas: Array<{ titulo: string; tipo_secao: TipoSecaoImportacao | null }>
}

function erroValidacao(error: ZodError): never {
  throw createError({
    statusCode: 400,
    statusMessage: error.issues[0]?.message ?? 'Confira os dados da importação.',
  })
}

export async function confirmarImportacao(
  event: H3Event,
  inputDesconhecido: unknown,
  nomeArquivo: string,
  arquivo: Uint8Array,
  usuario: UsuarioAutenticado,
) {
  const entrada = criarImportacaoSchema.safeParse(inputDesconhecido)
  if (!entrada.success) erroValidacao(entrada.error)

  const hashArquivo = await hashArquivoDocx(arquivo)
  if (hashArquivo !== entrada.data.hashArquivo) {
    throw createError({ statusCode: 409, statusMessage: 'O arquivo mudou desde a análise. Envie e analise o documento novamente.' })
  }

  const db = getDatabase(event)
  let codigoId = entrada.data.codigoId
  let novoCodigo: ReturnType<typeof codigoSchema.parse> | null = null

  if (entrada.data.novoCodigo) {
    const validacaoCodigo = codigoSchema.safeParse(entrada.data.novoCodigo)
    if (!validacaoCodigo.success) erroValidacao(validacaoCodigo.error)
    novoCodigo = validacaoCodigo.data
    codigoId = crypto.randomUUID()
  }
  if (!codigoId) {
    throw createError({ statusCode: 400, statusMessage: 'Selecione o código de destino da importação.' })
  }

  if (!novoCodigo) {
    const codigo = await db.prepare(
      'SELECT id FROM codigos WHERE id = ? AND excluido_em IS NULL',
    ).bind(codigoId).first<{ id: string }>()
    if (!codigo) throw createError({ statusCode: 404, statusMessage: 'O código de destino não foi encontrado.' })
  }

  const tiposProcessados = new Set<TipoSecaoImportacao>()
  const itensEntrantes: ItemParaComparar[] = []
  const ordemPorTipo = new Map<TipoSecaoImportacao, number>()
  const resumo: ResumoImportacao = { novos: [], removidos: [], inalterados: [], ignoradas: [] }
  let quantidadeItens = 0

  for (const secao of entrada.data.secoes) {
    if (secao.acao === 'ignorar' || !secao.tipoSecao) {
      resumo.ignoradas.push({ titulo: secao.tituloOriginal, tipo_secao: secao.tipoSecao })
      continue
    }
    tiposProcessados.add(secao.tipoSecao)
    tiposProcessados.add(secao.tipoSecao)
    for (const item of secao.itens) {
      quantidadeItens += 1
      if (quantidadeItens > 2000) {
        throw createError({ statusCode: 413, statusMessage: 'O documento contém mais de 2.000 itens. Divida a importação em documentos menores.' })
      }
      const ordem = (ordemPorTipo.get(secao.tipoSecao) ?? 0) + 1
      ordemPorTipo.set(secao.tipoSecao, ordem)
      itensEntrantes.push({
        tipoSecao: secao.tipoSecao,
        nomeCompleto: item.nomeCompleto,
        ...separarNomeItem(item.nomeCompleto),
        ordem,
      })
    }
  }

  const tipos = [...tiposProcessados]
  const atuais = tipos.length
    ? await db.prepare(
        `SELECT id, tipo_secao, nome_completo, ordem, versao
         FROM codigo_itens
         WHERE codigo_id = ? AND ativo = 1
           AND tipo_secao IN (${tipos.map(() => '?').join(', ')})
         ORDER BY ordem, id`,
      ).bind(codigoId, ...tipos).all<ItemAtual>()
    : { results: [] as ItemAtual[] }

  const comparacao = compararItensPorOcorrencia(itensEntrantes, atuais.results ?? [])
  resumo.novos = comparacao.novos.map(({ item, ocorrencia }) => ({
    tipo_secao: item.tipoSecao,
    nome_completo: item.nomeCompleto,
    ocorrencia,
  }))
  resumo.inalterados = comparacao.inalterados.map(({ item, ocorrencia }) => ({
    tipo_secao: item.tipoSecao,
    nome_completo: item.nomeCompleto,
    ocorrencia,
  }))
  resumo.removidos = comparacao.removidos.map(({ atual, ocorrencia }) => ({
    tipo_secao: atual.tipo_secao,
    nome_completo: atual.nome_completo,
    ocorrencia,
  }))

  const novosItens: ItemPersistido[] = comparacao.novos.map(({ item }) => ({
    id: crypto.randomUUID(),
    tipo_secao: item.tipoSecao,
    nome_completo: item.nomeCompleto,
    nome_original: item.nomeOriginal,
    nome_pt: item.nomePt,
    ordem: item.ordem,
    versao: 1,
    importacao_id: '',
  }))
  const removidos = comparacao.removidos.map(({ atual, ocorrencia }) => ({
    id: atual.id,
    item: { tipo_secao: atual.tipo_secao, nome_completo: atual.nome_completo, ocorrencia },
  }))
  const itensReordenados = comparacao.reordenados

  const importacaoId = crypto.randomUUID()
  for (const item of novosItens) item.importacao_id = importacaoId

  const comandos: D1PreparedStatement[] = []
  if (novoCodigo) {
    comandos.push(
      db.prepare(
        `INSERT INTO codigos (id, codigo, marca, modelo, motor, ano, observacoes, criado_por, atualizado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      ).bind(codigoId, novoCodigo.codigo, novoCodigo.marca, novoCodigo.modelo, novoCodigo.motor, novoCodigo.ano, novoCodigo.observacoes, usuario.id),
      db.prepare(
        `INSERT INTO historico_alteracoes (id, tabela, registro_id, usuario_id, antes, depois)
         VALUES (?, 'codigos', ?, ?, NULL, ?)`,
      ).bind(crypto.randomUUID(), codigoId, usuario.id, JSON.stringify({ ...novoCodigo, id: codigoId })),
    )
  }

  comandos.push(
    db.prepare(
      `INSERT INTO importacoes (id, codigo_id, nome_arquivo, usuario_id, resumo, status)
       VALUES (?, ?, ?, ?, ?, 'concluida')`,
    ).bind(importacaoId, codigoId, nomeArquivo.slice(0, 255), usuario.id, JSON.stringify(resumo)),
  )

  if (novosItens.length) {
    comandos.push(db.prepare(
      `INSERT INTO codigo_itens (
         id, codigo_id, tipo_secao, nome_completo, nome_original, nome_pt, ordem, versao, importacao_id, ativo
       )
       SELECT
         json_extract(value, '$.id'),
         json_extract(value, '$.codigo_id'),
         json_extract(value, '$.tipo_secao'),
         json_extract(value, '$.nome_completo'),
         json_extract(value, '$.nome_original'),
         json_extract(value, '$.nome_pt'),
         json_extract(value, '$.ordem'),
         1,
         json_extract(value, '$.importacao_id'),
         1
       FROM json_each(?)`,
    ).bind(JSON.stringify(novosItens.map(item => ({ ...item, codigo_id: codigoId })))))
  }

  if (removidos.length) {
    comandos.push(db.prepare(
      `UPDATE codigo_itens
       SET ativo = 0, versao = versao + 1, atualizado_em = datetime('now')
       WHERE ativo = 1 AND id IN (SELECT value FROM json_each(?))`,
    ).bind(JSON.stringify(removidos.map(item => item.id))))
  }

  if (itensReordenados.length) {
    comandos.push(db.prepare(
      `UPDATE codigo_itens
       SET versao = versao + CASE WHEN ordem != json_extract(value, '$.ordem') THEN 1 ELSE 0 END,
           ordem = json_extract(value, '$.ordem'),
           atualizado_em = CASE WHEN ordem != json_extract(value, '$.ordem') THEN datetime('now') ELSE atualizado_em END
       FROM json_each(?) AS atualizacao
       WHERE codigo_itens.id = json_extract(atualizacao.value, '$.id') AND codigo_itens.ativo = 1`,
    ).bind(JSON.stringify(itensReordenados)))
  }

  comandos.push(db.prepare(
    `INSERT INTO historico_alteracoes (id, tabela, registro_id, usuario_id, antes, depois)
     VALUES (?, 'codigo_itens', ?, ?, NULL, ?)`,
  ).bind(crypto.randomUUID(), codigoId, usuario.id, JSON.stringify(resumo)))

  try {
    await db.batch(comandos)
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed: codigos.codigo')) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Este código já está cadastrado. Informe um código diferente.',
      })
    }
    throw error
  }

  return { id: importacaoId, codigoId, resumo }
}
