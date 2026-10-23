import type { CodigoInput, ListagemCodigosInput } from '../schemas/codigos'

export interface CodigoListItem {
  id: string
  codigo: string
  marca: string
  modelo: string
  motor: string | null
  ano: number | null
  observacoes: string | null
  criado_em: string
  atualizado_em: string | null
  setor_id: string | null
  setor: string | null
  ultimo_teste: string | null
  ultimo_teste_data: string | null
  ultimo_teste_tipo: 'bancada' | 'campo' | null
  status_teste: 'em_andamento' | 'aprovado' | 'reprovado' | 'cancelado' | null
  ocorrencias_abertas: number
}

export interface CodigoRecord extends CodigoListItem {
  criado_por: string | null
  ultimo_teste_data: string | null
}

export interface AlteracaoCodigo {
  id: string
  usuario_id: string | null
  usuario_nome: string | null
  antes: Record<string, unknown> | null
  depois: Record<string, unknown> | null
  criado_em: string
}

interface CountRow {
  total: number
}

interface MarcaRow {
  marca: string
}

interface SetorRow {
  id: string
  nome: string
}

interface RegistroHistoricoRow {
  id: string
  usuario_id: string | null
  usuario_nome: string | null
  antes: string | null
  depois: string | null
  criado_em: string
}

const colunasOrdenacao: Record<ListagemCodigosInput['ordenar'], string> = {
  criado_em: 'c.criado_em',
  codigo: 'c.codigo COLLATE NOCASE',
  marca: 'c.marca COLLATE NOCASE',
  modelo: 'c.modelo COLLATE NOCASE',
  ano: 'c.ano',
  ultimo_teste: 'lt.criado_em',
}

function escaparBusca(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')
}

function whereCodigos(filtros: ListagemCodigosInput): { sql: string; valores: Array<string | number> } {
  const partes = ['c.excluido_em IS NULL']
  const valores: Array<string | number> = []
  if (filtros.busca) {
    const busca = escaparBusca(filtros.busca)
    partes.push("(c.codigo LIKE ? ESCAPE '\\' COLLATE NOCASE OR c.marca LIKE ? ESCAPE '\\' COLLATE NOCASE OR c.modelo LIKE ? ESCAPE '\\' COLLATE NOCASE)")
    valores.push(`%${busca}%`, `%${busca}%`, `%${busca}%`)
  }
  if (filtros.marca) {
    partes.push('c.marca = ? COLLATE NOCASE')
    valores.push(filtros.marca)
  }
  if (filtros.setor) {
    partes.push('u.setor_id = ?')
    valores.push(filtros.setor)
  }
  if (filtros.status === 'sem_teste') partes.push('lt.id IS NULL')
  else if (filtros.status !== 'todos') {
    partes.push('lt.status = ?')
    valores.push(filtros.status)
  }
  return { sql: partes.join(' AND '), valores }
}

const fromCodigos = `
  FROM codigos c
  LEFT JOIN usuarios u ON u.id = c.criado_por
  LEFT JOIN setores s ON s.id = u.setor_id
  LEFT JOIN (
    SELECT codigo_id, id, tipo, status, data_inicio, criado_em,
      ROW_NUMBER() OVER (PARTITION BY codigo_id ORDER BY data_inicio DESC, criado_em DESC, id DESC) AS numero_linha
    FROM testes
  ) lt ON lt.codigo_id = c.id AND lt.numero_linha = 1
`

const camposCodigo = `
  c.id, c.codigo, c.marca, c.modelo, c.motor, c.ano, c.observacoes,
  c.criado_em, c.atualizado_em, c.criado_por,
  u.setor_id, s.nome AS setor,
  lt.status AS status_teste, lt.tipo AS ultimo_teste_tipo, lt.data_inicio AS ultimo_teste_data,
  CASE WHEN lt.id IS NULL THEN NULL ELSE lt.tipo || ':' || lt.status END AS ultimo_teste,
  (SELECT COUNT(*) FROM ocorrencias o WHERE o.codigo_id = c.id AND o.status <> 'resolvida') AS ocorrencias_abertas
`

export async function listarCodigos(db: D1Database, filtros: ListagemCodigosInput) {
  const where = whereCodigos(filtros)
  const offset = (filtros.pagina - 1) * filtros.limite
  const order = colunasOrdenacao[filtros.ordenar]
  const direction = filtros.direcao === 'asc' ? 'ASC' : 'DESC'
  const [totalResult, listResult, marcasResult, setoresResult] = await db.batch([
    db.prepare(`SELECT COUNT(*) AS total ${fromCodigos} WHERE ${where.sql}`).bind(...where.valores),
    db.prepare(
      `SELECT ${camposCodigo} ${fromCodigos} WHERE ${where.sql}
       ORDER BY ${order} ${direction}, c.id ASC LIMIT ? OFFSET ?`,
    ).bind(...where.valores, filtros.limite, offset),
    db.prepare('SELECT DISTINCT marca FROM codigos WHERE excluido_em IS NULL ORDER BY marca COLLATE NOCASE'),
    db.prepare('SELECT id, nome FROM setores ORDER BY nome COLLATE NOCASE'),
  ])

  const total = (totalResult.results as CountRow[])[0]?.total ?? 0
  return {
    codigos: listResult.results as CodigoListItem[],
    total,
    pagina: filtros.pagina,
    limite: filtros.limite,
    total_paginas: Math.max(1, Math.ceil(total / filtros.limite)),
    marcas: (marcasResult.results as MarcaRow[]).map(row => row.marca),
    setores: setoresResult.results as SetorRow[],
  }
}

export async function buscarCodigo(db: D1Database, id: string): Promise<CodigoRecord | null> {
  return db.prepare(
    `SELECT ${camposCodigo} ${fromCodigos} WHERE c.id = ? AND c.excluido_em IS NULL LIMIT 1`,
  ).bind(id).first<CodigoRecord>()
}

export async function criarCodigo(db: D1Database, input: CodigoInput, usuarioId: string): Promise<string> {
  const id = crypto.randomUUID()
  const dados = { ...input, id }
  const statements = [
    db.prepare(
      `INSERT INTO codigos (id, codigo, marca, modelo, motor, ano, observacoes, criado_por, atualizado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    ).bind(id, input.codigo, input.marca, input.modelo, input.motor, input.ano, input.observacoes, usuarioId),
    db.prepare(
      `INSERT INTO historico_alteracoes (id, tabela, registro_id, usuario_id, antes, depois)
       VALUES (?, 'codigos', ?, ?, NULL, ?)`,
    ).bind(crypto.randomUUID(), id, usuarioId, JSON.stringify(dados)),
  ]
  await db.batch(statements)
  return id
}

export async function editarCodigo(db: D1Database, id: string, input: CodigoInput, usuarioId: string): Promise<boolean> {
  const antes = await db.prepare(
    `SELECT id, codigo, marca, modelo, motor, ano, observacoes, criado_por, criado_em, atualizado_em
     FROM codigos WHERE id = ? AND excluido_em IS NULL`,
  ).bind(id).first<Record<string, unknown>>()
  if (!antes) return false

  const depois = { ...input, id }
  const [atualizado] = await db.batch([
    db.prepare(
      `UPDATE codigos
       SET codigo = ?, marca = ?, modelo = ?, motor = ?, ano = ?, observacoes = ?, atualizado_em = datetime('now')
       WHERE id = ? AND excluido_em IS NULL`,
    ).bind(input.codigo, input.marca, input.modelo, input.motor, input.ano, input.observacoes, id),
    db.prepare(
      `INSERT INTO historico_alteracoes (id, tabela, registro_id, usuario_id, antes, depois)
       SELECT ?, 'codigos', ?, ?, ?, ? WHERE changes() = 1`,
    ).bind(crypto.randomUUID(), id, usuarioId, JSON.stringify(antes), JSON.stringify(depois)),
  ])
  return atualizado.meta.changes === 1
}

export async function excluirCodigo(db: D1Database, id: string, usuarioId: string): Promise<boolean> {
  const antes = await db.prepare(
    `SELECT id, codigo, marca, modelo, motor, ano, observacoes, criado_por, criado_em, atualizado_em
     FROM codigos WHERE id = ? AND excluido_em IS NULL`,
  ).bind(id).first<Record<string, unknown>>()
  if (!antes) return false

  const [atualizado] = await db.batch([
    db.prepare(
      `UPDATE codigos SET excluido_em = datetime('now'), atualizado_em = datetime('now')
       WHERE id = ? AND excluido_em IS NULL`,
    ).bind(id),
    db.prepare(
      `INSERT INTO historico_alteracoes (id, tabela, registro_id, usuario_id, antes, depois)
       SELECT ?, 'codigos', ?, ?, ?, json_object('id', ?, 'excluido_em', datetime('now'))
       WHERE changes() = 1`,
    ).bind(crypto.randomUUID(), id, usuarioId, JSON.stringify(antes), id),
  ])
  return atualizado.meta.changes === 1
}

export async function excluirCodigos(db: D1Database, ids: string[], usuarioId: string): Promise<number> {
  if (!ids.length) return 0
  const placeholders = ids.map(() => '?').join(', ')
  const encontrados = await db.prepare(
    `SELECT id, codigo, marca, modelo, motor, ano, observacoes, criado_por, criado_em, atualizado_em
     FROM codigos WHERE excluido_em IS NULL AND id IN (${placeholders})`,
  ).bind(...ids).all<Record<string, unknown>>()
  const codigos = encontrados.results
  if (!codigos.length) return 0

  const statements: D1PreparedStatement[] = []
  for (const codigo of codigos) {
    statements.push(
      db.prepare(
        `UPDATE codigos SET excluido_em = datetime('now'), atualizado_em = datetime('now')
         WHERE id = ? AND excluido_em IS NULL`,
      ).bind(codigo.id),
      db.prepare(
        `INSERT INTO historico_alteracoes (id, tabela, registro_id, usuario_id, antes, depois)
         SELECT ?, 'codigos', ?, ?, ?, json_object('id', ?, 'excluido_em', datetime('now'))
         WHERE changes() = 1`,
      ).bind(crypto.randomUUID(), codigo.id, usuarioId, JSON.stringify(codigo), codigo.id),
    )
  }
  const resultados = await db.batch(statements)
  return resultados.filter((result, index) => index % 2 === 0 && result.meta.changes === 1).length
}

export async function duplicarCodigo(db: D1Database, id: string, usuarioId: string): Promise<string | null> {
  const original = await db.prepare(
    `SELECT id, codigo, marca, modelo, motor, ano, observacoes FROM codigos
     WHERE id = ? AND excluido_em IS NULL`,
  ).bind(id).first<CodigoInput & { id: string }>()
  if (!original) return null

  let codigo = `${String(original.codigo)}-COPIA`.slice(0, 80)
  let sufixo = 2
  while (await db.prepare('SELECT 1 AS encontrado FROM codigos WHERE codigo = ? COLLATE NOCASE').bind(codigo).first()) {
    const sufixoTexto = `-COPIA-${sufixo}`
    codigo = `${String(original.codigo).slice(0, 80 - sufixoTexto.length)}${sufixoTexto}`
    sufixo += 1
  }

  return criarCodigo(db, { ...original, codigo }, usuarioId)
}

export async function listarHistoricoCodigo(db: D1Database, id: string): Promise<AlteracaoCodigo[]> {
  const resultado = await db.prepare(
    `SELECT h.id, h.usuario_id, u.nome AS usuario_nome, h.antes, h.depois, h.criado_em
     FROM historico_alteracoes h
     LEFT JOIN usuarios u ON u.id = h.usuario_id
     WHERE h.tabela = 'codigos' AND h.registro_id = ?
     ORDER BY h.criado_em DESC, h.id DESC LIMIT 100`,
  ).bind(id).all<RegistroHistoricoRow>()

  return resultado.results.map(item => ({
    id: item.id,
    usuario_id: item.usuario_id,
    usuario_nome: item.usuario_nome,
    antes: item.antes ? JSON.parse(item.antes) as Record<string, unknown> : null,
    depois: item.depois ? JSON.parse(item.depois) as Record<string, unknown> : null,
    criado_em: item.criado_em,
  }))
}

export async function obterMetricasPainel(db: D1Database) {
  const dataAtual = new Date()
  const periodos: Array<{ periodo: string; inicio: string; fim: string }> = []
  for (let deslocamento = 5; deslocamento >= 0; deslocamento -= 1) {
    const inicio = new Date(Date.UTC(dataAtual.getUTCFullYear(), dataAtual.getUTCMonth() - deslocamento, 1))
    const fim = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() + 1, 1))
    periodos.push({
      periodo: `${inicio.getUTCFullYear()}-${String(inicio.getUTCMonth() + 1).padStart(2, '0')}`,
      inicio: inicio.toISOString().slice(0, 10),
      fim: fim.toISOString().slice(0, 10),
    })
  }

  const [totalResult, bancadaResult, campoResult, falhasResult, distribuicaoResult, recentesResult] = await db.batch([
    db.prepare('SELECT COUNT(*) AS total FROM codigos WHERE excluido_em IS NULL'),
    db.prepare(`SELECT COUNT(*) AS total FROM (
      SELECT t.codigo_id, t.status, ROW_NUMBER() OVER (PARTITION BY t.codigo_id ORDER BY t.data_inicio DESC, t.criado_em DESC, t.id DESC) AS numero_linha
      FROM testes t JOIN codigos c ON c.id = t.codigo_id
      WHERE c.excluido_em IS NULL AND t.tipo = 'bancada'
    ) WHERE numero_linha = 1 AND status = 'em_andamento'`),
    db.prepare(`SELECT COUNT(*) AS total FROM (
      SELECT t.codigo_id, t.status, ROW_NUMBER() OVER (PARTITION BY t.codigo_id ORDER BY t.data_inicio DESC, t.criado_em DESC, t.id DESC) AS numero_linha
      FROM testes t JOIN codigos c ON c.id = t.codigo_id
      WHERE c.excluido_em IS NULL AND t.tipo = 'campo'
    ) WHERE numero_linha = 1 AND status = 'em_andamento'`),
    db.prepare(`SELECT COUNT(DISTINCT o.codigo_id) AS total FROM ocorrencias o
      JOIN codigos c ON c.id = o.codigo_id
      WHERE c.excluido_em IS NULL AND o.status <> 'resolvida'`),
    db.prepare(`SELECT COALESCE(lt.status, 'sem_teste') AS status, COUNT(*) AS total
      FROM codigos c
      LEFT JOIN (
        SELECT codigo_id, status, ROW_NUMBER() OVER (PARTITION BY codigo_id ORDER BY data_inicio DESC, criado_em DESC, id DESC) AS numero_linha
        FROM testes
      ) lt ON lt.codigo_id = c.id AND lt.numero_linha = 1
      WHERE c.excluido_em IS NULL
      GROUP BY COALESCE(lt.status, 'sem_teste')`),
    db.prepare(`SELECT ${camposCodigo} ${fromCodigos}
      WHERE c.excluido_em IS NULL ORDER BY c.criado_em DESC, c.id DESC LIMIT 6`),
  ])

  const countByPeriod = new Map<string, number>()
  const [periodStart, periodEnd] = [periodos[0]?.inicio, periodos[periodos.length - 1]?.fim]
  if (periodStart && periodEnd) {
    const monthlyResult = await db.prepare(
      `SELECT strftime('%Y-%m', criado_em) AS periodo, COUNT(*) AS total
       FROM codigos WHERE excluido_em IS NULL AND criado_em >= ? AND criado_em < ?
       GROUP BY strftime('%Y-%m', criado_em)`,
    ).bind(periodStart, periodEnd).all<{ periodo: string; total: number }>()
    for (const row of monthlyResult.results) countByPeriod.set(row.periodo, row.total)
  }

  const totalCadastros = (totalResult.results as CountRow[])[0]?.total ?? 0
  const codigosPorMes = periodos.map(({ periodo }) => ({
    periodo,
    total: countByPeriod.get(periodo) ?? 0,
  }))
  return {
    metricas: {
      total_codigos: totalCadastros,
      em_bancada: (bancadaResult.results as CountRow[])[0]?.total ?? 0,
      em_campo: (campoResult.results as CountRow[])[0]?.total ?? 0,
      com_falhas: (falhasResult.results as CountRow[])[0]?.total ?? 0,
    },
    distribuicao: (distribuicaoResult.results as Array<{ status: string; total: number }>),
    codigos_por_mes: codigosPorMes,
    codigos_recentes: recentesResult.results as CodigoListItem[],
  }
}
