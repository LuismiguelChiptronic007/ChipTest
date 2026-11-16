import type {
  AtualizarOcorrenciaInput,
  CriarOcorrenciaInput,
  ListagemOcorrenciasInput,
} from '../schemas/ocorrencias'
import type { TipoMimeAnexo } from './ocorrencias-config'

export type PapelOcorrencia = 'admin' | 'engenharia' | 'bancada' | 'campo'
export type StatusOcorrencia = 'aberta' | 'em_analise' | 'resolvida' | 'descartada'
export type GravidadeOcorrencia = 'baixa' | 'media' | 'alta' | 'critica'

export interface UsuarioOcorrencia {
  id: string
  papel: PapelOcorrencia
}

export interface OcorrenciaRegistro {
  id: string
  codigo_id: string
  codigo: string
  marca: string
  modelo: string
  teste_id: string | null
  teste_item_id: string | null
  codigo_item_id: string | null
  tipo_teste: string | null
  titulo: string
  descricao: string
  gravidade: GravidadeOcorrencia
  status: StatusOcorrencia
  relatado_por: string
  relator_nome: string
  responsavel_id: string | null
  responsavel_nome: string | null
  resolucao: string | null
  criado_em: string
  atualizado_em: string
  resolvido_em: string | null
  teste_resumo: string | null
  teste_item_nome: string | null
  codigo_item_nome: string | null
  total_anexos: number
  total_comentarios: number
}

const transicoesPermitidas: Record<StatusOcorrencia, readonly StatusOcorrencia[]> = {
  aberta: ['em_analise', 'descartada'],
  em_analise: ['aberta', 'resolvida', 'descartada'],
  resolvida: ['em_analise'],
  descartada: ['em_analise'],
}

export function papelPodeEditarConteudoOcorrencia(papel: PapelOcorrencia, usuarioId: string, relatorId: string): boolean {
  return papel === 'admin' || papel === 'engenharia' || usuarioId === relatorId
}

export function papelPodeGerenciarFluxoOcorrencia(papel: PapelOcorrencia): boolean {
  return papel === 'admin' || papel === 'engenharia'
}

export function papelPodeExcluirAnexo(
  papel: PapelOcorrencia,
  usuarioId: string,
  relatorId: string,
): boolean {
  return papel === 'admin'
    || papel === 'engenharia'
    || usuarioId === relatorId
}

export function transicaoOcorrenciaPermitida(
  atual: StatusOcorrencia,
  proximo: StatusOcorrencia,
): boolean {
  return atual === proximo || transicoesPermitidas[atual].includes(proximo)
}

export function itemTestePodeGerarOcorrencia(resultado: string): boolean {
  return resultado === 'reprovado'
}

export interface ArquivoOcorrenciaInput {
  nomeOriginal: string
  tipoMime: string
  tamanhoBytes: number
}

const extensoesPorMime: Record<TipoMimeAnexo, readonly string[]> = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
  'video/mp4': ['.mp4'],
  'text/plain': ['.txt', '.log'],
}

export function arquivoOcorrenciaValido(
  arquivo: ArquivoOcorrenciaInput,
  tamanhoMaximo: number,
): boolean {
  if (arquivo.tamanhoBytes < 1 || arquivo.tamanhoBytes > tamanhoMaximo) return false
  const nome = arquivo.nomeOriginal.trim().toLocaleLowerCase('pt-BR')
  const tipoMime = arquivo.tipoMime as TipoMimeAnexo
  return Boolean(extensoesPorMime[tipoMime]?.some(extensao => nome.endsWith(extensao)))
}

function escaparBusca(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')
}

const colunasOrdenacao: Record<ListagemOcorrenciasInput['ordenar'], string> = {
  recentes: 'o.criado_em DESC, o.id DESC',
  antigas: 'o.criado_em ASC, o.id ASC',
  gravidade: `CASE o.gravidade WHEN 'critica' THEN 4 WHEN 'alta' THEN 3 WHEN 'media' THEN 2 ELSE 1 END DESC, o.criado_em DESC`,
  titulo: 'o.titulo COLLATE NOCASE ASC, o.criado_em DESC',
}

const selectOcorrencias = `
  SELECT o.id, o.codigo_id, c.codigo, c.marca, c.modelo, o.teste_id,
    o.teste_item_id, o.codigo_item_id, o.tipo_teste, o.titulo, o.descricao, o.gravidade,
    o.status, o.relatado_por, relator.nome AS relator_nome, o.responsavel_id,
    responsavel.nome AS responsavel_nome, o.resolucao, o.criado_em,
    o.atualizado_em, o.resolvido_em,
    (SELECT t.tipo || ' · teste ' || t.numero FROM testes t WHERE t.id = o.teste_id) AS teste_resumo,
    (SELECT ti.nome_snapshot FROM teste_itens ti WHERE ti.id = o.teste_item_id) AS teste_item_nome,
    (SELECT ci.nome_completo FROM codigo_itens ci WHERE ci.id = o.codigo_item_id) AS codigo_item_nome,
    (SELECT COUNT(*) FROM anexos a
      WHERE a.ocorrencia_id = o.id AND a.status_upload = 'pronto') AS total_anexos,
    (SELECT COUNT(*) FROM ocorrencia_comentarios cm
      WHERE cm.ocorrencia_id = o.id) AS total_comentarios
  FROM ocorrencias o
  JOIN codigos c ON c.id = o.codigo_id
  JOIN usuarios relator ON relator.id = o.relatado_por
  LEFT JOIN usuarios responsavel ON responsavel.id = o.responsavel_id
`

export async function listarOcorrencias(db: D1Database, filtros: ListagemOcorrenciasInput) {
  const condicoes: string[] = []
  const valores: Array<string | number> = []
  if (filtros.status) {
    condicoes.push('o.status = ?')
    valores.push(filtros.status)
  }
  if (filtros.gravidade) {
    condicoes.push('o.gravidade = ?')
    valores.push(filtros.gravidade)
  }
  if (filtros.codigoId) {
    condicoes.push('o.codigo_id = ?')
    valores.push(filtros.codigoId)
  }
  if (filtros.testeId) {
    condicoes.push('o.teste_id = ?')
    valores.push(filtros.testeId)
  }
  if (filtros.responsavelId) {
    condicoes.push('o.responsavel_id = ?')
    valores.push(filtros.responsavelId)
  }
  if (filtros.de) {
    condicoes.push("date(o.criado_em) >= date(?)")
    valores.push(filtros.de)
  }
  if (filtros.ate) {
    condicoes.push("date(o.criado_em) <= date(?)")
    valores.push(filtros.ate)
  }
  if (filtros.busca) {
    condicoes.push("o.titulo LIKE ? ESCAPE '\\' COLLATE NOCASE")
    valores.push(`%${escaparBusca(filtros.busca)}%`)
  }
  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : ''
  const offset = (filtros.pagina - 1) * filtros.limite
  const [contagem, resultado, responsaveis, codigos] = await Promise.all([
    db.prepare(`SELECT COUNT(*) AS total FROM ocorrencias o ${where}`)
      .bind(...valores)
      .first<{ total: number }>(),
    db.prepare(
      `${selectOcorrencias} ${where}
       ORDER BY ${colunasOrdenacao[filtros.ordenar]}
       LIMIT ? OFFSET ?`,
    ).bind(...valores, filtros.limite, offset).all<OcorrenciaRegistro>(),
    db.prepare(
      `SELECT id, nome FROM usuarios WHERE ativo = 1 ORDER BY nome COLLATE NOCASE`,
    ).all<{ id: string; nome: string }>(),
    db.prepare(
      `SELECT id, codigo, marca, modelo FROM codigos
       WHERE excluido_em IS NULL ORDER BY codigo COLLATE NOCASE`,
    ).all<{ id: string; codigo: string; marca: string; modelo: string }>(),
  ])
  const total = contagem?.total ?? 0
  return {
    ocorrencias: resultado.results,
    total,
    pagina: filtros.pagina,
    limite: filtros.limite,
    total_paginas: Math.max(1, Math.ceil(total / filtros.limite)),
    responsaveis: responsaveis.results ?? [],
    codigos: codigos.results ?? [],
  }
}

export async function buscarOcorrencia(db: D1Database, id: string, usuarioId: string) {
  const ocorrencia = await db.prepare(`${selectOcorrencias} WHERE o.id = ?`)
    .bind(id)
    .first<OcorrenciaRegistro>()
  if (!ocorrencia) return null

  const [comentarios, anexos, historico] = await Promise.all([
    db.prepare(
      `SELECT cm.id, cm.usuario_id, u.nome AS usuario_nome, cm.texto, cm.criado_em
       FROM ocorrencia_comentarios cm
       JOIN usuarios u ON u.id = cm.usuario_id
       WHERE cm.ocorrencia_id = ? ORDER BY cm.criado_em, cm.id`,
    ).bind(id).all<{
      id: string
      usuario_id: string
      usuario_nome: string
      texto: string
      criado_em: string
    }>(),
    db.prepare(
      `SELECT id, ocorrencia_id, nome_original, tipo_mime, tamanho_bytes,
         enviado_por, status_upload, criado_em
       FROM anexos
       WHERE ocorrencia_id = ? AND (status_upload = 'pronto' OR enviado_por = ?)
       ORDER BY criado_em, id`,
    ).bind(id, usuarioId).all<{
      id: string
      ocorrencia_id: string
      nome_original: string
      tipo_mime: string
      tamanho_bytes: number
      enviado_por: string
      status_upload: 'enviando' | 'pronto'
      criado_em: string
    }>(),
    db.prepare(
      `SELECT h.id, h.usuario_id, u.nome AS usuario_nome, h.antes, h.depois, h.criado_em
       FROM historico_alteracoes h
       LEFT JOIN usuarios u ON u.id = h.usuario_id
       WHERE h.tabela = 'ocorrencias' AND h.registro_id = ?
       ORDER BY h.criado_em, h.id`,
    ).bind(id).all<{
      id: string
      usuario_id: string | null
      usuario_nome: string | null
      antes: string | null
      depois: string | null
      criado_em: string
    }>(),
  ])
  return {
    ocorrencia,
    comentarios: comentarios.results,
    anexos: anexos.results,
    historico: historico.results.map(item => ({
      ...item,
      antes: item.antes ? JSON.parse(item.antes) as Record<string, unknown> : null,
      depois: item.depois ? JSON.parse(item.depois) as Record<string, unknown> : null,
    })),
  }
}

export async function criarOcorrencia(
  db: D1Database,
  input: CriarOcorrenciaInput,
  usuarioId: string,
): Promise<string> {
  const codigo = await db.prepare(
    'SELECT id FROM codigos WHERE id = ? AND excluido_em IS NULL',
  ).bind(input.codigoId).first<{ id: string }>()
  if (!codigo) throw createError({ statusCode: 404, statusMessage: 'Código não encontrado.' })

  let testeId = input.testeId ?? null
  if (testeId) {
    const teste = await db.prepare(
      'SELECT id, codigo_id FROM testes WHERE id = ?',
    ).bind(testeId).first<{ id: string; codigo_id: string }>()
    if (!teste || teste.codigo_id !== input.codigoId) {
      throw createError({ statusCode: 400, statusMessage: 'O teste selecionado não pertence ao código informado.' })
    }
  }

  if (input.testeItemId) {
    const item = await db.prepare(
      `SELECT ti.id, ti.codigo_item_id, ti.resultado, t.id AS teste_id, t.codigo_id
       FROM teste_itens ti JOIN testes t ON t.id = ti.teste_id
       WHERE ti.id = ?`,
    ).bind(input.testeItemId).first<{
      id: string
      codigo_item_id: string | null
      resultado: string
      teste_id: string
      codigo_id: string
    }>()
    if (!item || item.codigo_id !== input.codigoId || item.teste_id !== testeId) {
      throw createError({ statusCode: 400, statusMessage: 'O item selecionado não pertence ao teste e código informados.' })
    }
    if (!itemTestePodeGerarOcorrencia(item.resultado)) {
      throw createError({ statusCode: 400, statusMessage: 'Uma ocorrência vinculada a um item de teste exige que ele esteja reprovado.' })
    }
    if (input.codigoItemId && item.codigo_item_id !== input.codigoItemId) {
      throw createError({ statusCode: 400, statusMessage: 'O item técnico selecionado não corresponde ao item reprovado.' })
    }
    if (!input.codigoItemId) input = { ...input, codigoItemId: item.codigo_item_id ?? undefined }
  }

  if (input.codigoItemId) {
    const itemCodigo = await db.prepare(
      'SELECT id FROM codigo_itens WHERE id = ? AND codigo_id = ?',
    ).bind(input.codigoItemId, input.codigoId).first<{ id: string }>()
    if (!itemCodigo) throw createError({ statusCode: 400, statusMessage: 'O item técnico não pertence ao código informado.' })
  }

  const id = crypto.randomUUID()
  await db.prepare(
    `INSERT INTO ocorrencias
      (id, codigo_id, teste_id, teste_item_id, codigo_item_id, tipo_teste,
       titulo, descricao, gravidade, status, relatado_por, resolvido_em)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'resolvida' THEN datetime('now') ELSE NULL END)`,
  ).bind(
    id,
    input.codigoId,
    testeId,
    input.testeItemId ?? null,
    input.codigoItemId ?? null,
    input.tipoTeste,
    input.titulo,
    input.descricao,
    input.gravidade,
    input.status,
    usuarioId,
    input.status,
  ).run()
  return id
}

export async function adicionarComentario(
  db: D1Database,
  ocorrenciaId: string,
  usuarioId: string,
  texto: string,
): Promise<string> {
  const existe = await db.prepare('SELECT id FROM ocorrencias WHERE id = ?')
    .bind(ocorrenciaId)
    .first<{ id: string }>()
  if (!existe) throw createError({ statusCode: 404, statusMessage: 'Ocorrência não encontrada.' })
  const id = crypto.randomUUID()
  await db.prepare(
    'INSERT INTO ocorrencia_comentarios (id, ocorrencia_id, usuario_id, texto) VALUES (?, ?, ?, ?)',
  ).bind(id, ocorrenciaId, usuarioId, texto).run()
  return id
}

export async function atualizarOcorrencia(
  db: D1Database,
  ocorrenciaId: string,
  usuario: UsuarioOcorrencia,
  input: AtualizarOcorrenciaInput,
): Promise<boolean> {
  const atual = await db.prepare(
    `SELECT id, tipo_teste, titulo, descricao, gravidade, status, responsavel_id, resolucao
     FROM ocorrencias WHERE id = ?`,
  ).bind(ocorrenciaId).first<{
    id: string
    tipo_teste: string | null
    titulo: string
    descricao: string
    gravidade: GravidadeOcorrencia
    status: StatusOcorrencia
    responsavel_id: string | null
    resolucao: string | null
  }>()
  if (!atual) return false

  const temConteudo = input.tipoTeste !== undefined
    || input.titulo !== undefined
    || input.descricao !== undefined
    || input.gravidade !== undefined
  const temFluxo = input.status !== undefined
    || input.responsavelId !== undefined
    || input.resolucao !== undefined
  const autor = await db.prepare('SELECT relatado_por FROM ocorrencias WHERE id = ?')
    .bind(ocorrenciaId)
    .first<{ relatado_por: string }>()
  if (!autor) return false
  if (temConteudo && !papelPodeEditarConteudoOcorrencia(usuario.papel, usuario.id, autor.relatado_por)) {
    throw createError({ statusCode: 403, statusMessage: 'Somente quem relatou, engenharia ou admin pode editar o conteúdo.' })
  }
  if (temFluxo && !papelPodeGerenciarFluxoOcorrencia(usuario.papel)) {
    throw createError({ statusCode: 403, statusMessage: 'Somente engenharia ou admin pode alterar o fluxo da ocorrência.' })
  }

  if (input.status && !transicaoOcorrenciaPermitida(atual.status, input.status)) {
    throw createError({
      statusCode: 409,
      statusMessage: `Não é permitido alterar o status de ${atual.status.replace('_', ' ')} para ${input.status.replace('_', ' ')}.`,
    })
  }
  if (input.status === 'resolvida' && !(input.resolucao ?? atual.resolucao)?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Informe a resolução antes de concluir a ocorrência.' })
  }
  if (input.responsavelId) {
    const responsavel = await db.prepare(
      'SELECT id FROM usuarios WHERE id = ? AND ativo = 1',
    ).bind(input.responsavelId).first<{ id: string }>()
    if (!responsavel) throw createError({ statusCode: 400, statusMessage: 'O responsável selecionado não está ativo.' })
  }

  const status = input.status ?? atual.status
  const responsavelId = input.responsavelId === undefined ? atual.responsavel_id : input.responsavelId
  const resolucao = input.resolucao === undefined ? atual.resolucao : input.resolucao
  const mudouFluxo = status !== atual.status || responsavelId !== atual.responsavel_id
  const antes = mudouFluxo
    ? JSON.stringify({ status: atual.status, responsavel_id: atual.responsavel_id, resolucao: atual.resolucao })
    : null
  const depois = mudouFluxo
    ? JSON.stringify({ status, responsavel_id: responsavelId, resolucao })
    : null
  const sets = [
    'tipo_teste = ?',
    'titulo = ?',
    'descricao = ?',
    'gravidade = ?',
    'status = ?',
    'responsavel_id = ?',
    'resolucao = ?',
    "resolvido_em = CASE WHEN ? = 'resolvida' THEN COALESCE(resolvido_em, datetime('now')) ELSE NULL END",
    "atualizado_em = datetime('now')",
  ]
  const statements: D1PreparedStatement[] = [
    db.prepare(`UPDATE ocorrencias SET ${sets.join(', ')} WHERE id = ?`).bind(
      input.tipoTeste ?? atual.tipo_teste,
      input.titulo ?? atual.titulo,
      input.descricao ?? atual.descricao,
      input.gravidade ?? atual.gravidade,
      status,
      responsavelId,
      resolucao,
      status,
      ocorrenciaId,
    ),
  ]
  if (mudouFluxo) {
    statements.push(db.prepare(
      `INSERT INTO historico_alteracoes (id, tabela, registro_id, usuario_id, antes, depois)
       SELECT ?, 'ocorrencias', ?, ?, ?, ? WHERE changes() = 1`,
    ).bind(crypto.randomUUID(), ocorrenciaId, usuario.id, antes, depois))
  }
  const resultados = await db.batch(statements)
  return resultados[0]?.meta.changes === 1
}
