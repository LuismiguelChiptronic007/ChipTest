import type {
  AtualizarTesteOcorrenciaInput,
  CriarTesteOcorrenciaInput,
  StatusTesteOcorrencia,
  TipoTesteOcorrencia,
} from '../schemas/ocorrencia-testes'
import { papelPodeTestar, type PapelTeste } from './testes'

export interface UsuarioTesteOcorrencia {
  id: string
  papel: PapelTeste
}

interface TesteOcorrenciaRecord {
  id: string
  ocorrencia_id: string
  source: 'ocorrencia' | 'carga'
  source_test_id: string | null
  kind: TipoTesteOcorrencia
  sequence: number
  status: StatusTesteOcorrencia
  tested_at: string
  responsible_id: string | null
  responsible_name: string | null
  responsibles?: Array<{ id: string; nome: string }>
  result: string | null
  notes: string | null
  segment?: string | null
  model?: string | null
  version?: string | null
  load_status?: 'aprovada' | 'reprovada' | null
  structure_status?: 'aprovada' | 'reprovada' | null
  needs_bench?: number | null
  needs_field?: number | null
  bench_solves?: number | null
  created_by: string
  created_at: string
  updated_at: string
}

interface TesteCargaRecord {
  id: string
  tipo: TipoTesteOcorrencia
  numero: number
  responsavel_id: string
  responsavel_nome: string
  data_inicio: string
  status: 'em_andamento' | 'aprovado' | 'reprovado' | 'cancelado'
  observacoes: string | null
  relatado_por: string
  item_resultado: 'nao_testado' | 'aprovado' | 'reprovado' | 'nao_se_aplica' | null
  item_observacao: string | null
}

export function identificarTesteCarga(tipoTeste: string | null): { kind: TipoTesteOcorrencia; sequence: number } | null {
  if (!tipoTeste) return null
  const match = /\b(bancada|campo)\b[\s\S]*?(\d+)\s*$/i.exec(tipoTeste.trim())
  if (!match) return null
  const sequence = Number(match[2])
  if (!Number.isSafeInteger(sequence) || sequence < 1) return null
  return { kind: match[1]!.toLocaleLowerCase('pt-BR') as TipoTesteOcorrencia, sequence }
}

function exigirPermissao(usuario: UsuarioTesteOcorrencia, kind: TipoTesteOcorrencia) {
  if (!papelPodeTestar(usuario.papel, kind)) {
    throw createError({
      statusCode: 403,
      statusMessage: `Somente perfis de ${kind}, engenharia ou admin podem gerenciar testes desse tipo.`,
    })
  }
}

async function validarRelacao(
  db: D1Database,
  ocorrenciaId: string,
  kind: TipoTesteOcorrencia,
  usuario: UsuarioTesteOcorrencia,
  responsibleIds: string[],
) {
  exigirPermissao(usuario, kind)
  const ocorrencia = await db.prepare('SELECT id FROM ocorrencias WHERE id = ?')
    .bind(ocorrenciaId)
    .first<{ id: string }>()
  if (!ocorrencia) throw createError({ statusCode: 404, statusMessage: 'Ocorrência não encontrada.' })

  if (responsibleIds.length) {
    const placeholders = responsibleIds.map(() => '?').join(', ')
    const responsaveis = await db.prepare(
      `SELECT id FROM usuarios WHERE id IN (${placeholders}) AND ativo = 1`,
    ).bind(...responsibleIds).all<{ id: string }>()
    if (responsaveis.results.length !== responsibleIds.length) {
      throw createError({ statusCode: 400, statusMessage: 'Um ou mais responsáveis selecionados não estão ativos.' })
    }
  }
}

async function buscarTeste(db: D1Database, id: string): Promise<TesteOcorrenciaRecord | null> {
  return db.prepare(
    `SELECT t.id, t.ocorrencia_id, t.kind, t.sequence, t.status, t.tested_at,
       t.responsible_id, u.nome AS responsible_name, t.result, t.notes,
       t.segment, t.model, t.version, t.load_status, t.structure_status,
       t.needs_bench, t.needs_field, t.bench_solves,
       t.created_by, t.created_at, t.updated_at
     FROM ocorrencia_testes t
     LEFT JOIN usuarios u ON u.id = t.responsible_id
     WHERE t.id = ?`,
  ).bind(id).first<TesteOcorrenciaRecord>()
}

export async function listarTestesOcorrencia(db: D1Database, ocorrenciaId: string) {
  const ocorrencia = await db.prepare(
    `SELECT id, codigo_id, teste_id, tipo_teste, teste_item_id, relatado_por
     FROM ocorrencias WHERE id = ?`,
  )
    .bind(ocorrenciaId)
    .first<{
      id: string
      codigo_id: string
      teste_id: string | null
      tipo_teste: string | null
      teste_item_id: string | null
      relatado_por: string
    }>()
  if (!ocorrencia) return null

  const resultado = await db.prepare(
    `SELECT t.id, t.ocorrencia_id, t.kind, t.sequence, t.status, t.tested_at,
       t.responsible_id, u.nome AS responsible_name, t.result, t.notes,
       t.segment, t.model, t.version, t.load_status, t.structure_status,
       t.needs_bench, t.needs_field, t.bench_solves,
       t.created_by, t.created_at, t.updated_at
     FROM ocorrencia_testes t
     LEFT JOIN usuarios u ON u.id = t.responsible_id
     WHERE t.ocorrencia_id = ?
     ORDER BY t.tested_at DESC, t.created_at DESC, t.sequence DESC`,
  ).bind(ocorrenciaId).all<TesteOcorrenciaRecord>()

  const testes: TesteOcorrenciaRecord[] = resultado.results.map(teste => ({
    ...teste,
    source: 'ocorrencia' as const,
    source_test_id: null,
  }))

  let testeCarga: TesteCargaRecord | null = null
  if (ocorrencia.teste_id) {
    testeCarga = await db.prepare(
      `SELECT t.id, t.tipo, t.numero, t.responsavel_id, u.nome AS responsavel_nome,
         t.data_inicio, t.status, t.observacoes, ? AS relatado_por,
         ti.resultado AS item_resultado, ti.observacao AS item_observacao
       FROM testes t
       JOIN usuarios u ON u.id = t.responsavel_id
       LEFT JOIN teste_itens ti ON ti.id = ? AND ti.teste_id = t.id
       WHERE t.id = ? AND t.codigo_id = ?`,
    ).bind(
      ocorrencia.relatado_por,
      ocorrencia.teste_item_id,
      ocorrencia.teste_id,
      ocorrencia.codigo_id,
    ).first<TesteCargaRecord>()
  } else {
    const tipoNumero = identificarTesteCarga(ocorrencia.tipo_teste)
    if (tipoNumero) {
      testeCarga = await db.prepare(
        `SELECT t.id, t.tipo, t.numero, t.responsavel_id, u.nome AS responsavel_nome,
           t.data_inicio, t.status, t.observacoes, ? AS relatado_por,
           ti.resultado AS item_resultado, ti.observacao AS item_observacao
         FROM testes t
         JOIN usuarios u ON u.id = t.responsavel_id
         LEFT JOIN teste_itens ti ON ti.id = ? AND ti.teste_id = t.id
         WHERE t.codigo_id = ? AND t.tipo = ? AND t.numero = ?`,
      ).bind(
        ocorrencia.relatado_por,
        ocorrencia.teste_item_id,
        ocorrencia.codigo_id,
        tipoNumero.kind,
        tipoNumero.sequence,
      ).first<TesteCargaRecord>()
    }
  }

  if (testeCarga && !testes.some(teste => teste.source_test_id === testeCarga!.id)) {
    const status: StatusTesteOcorrencia = testeCarga.status === 'cancelado'
      ? 'pendente'
      : testeCarga.status
    testes.push({
      id: testeCarga.id,
      ocorrencia_id: ocorrenciaId,
      source: 'carga',
      source_test_id: testeCarga.id,
      kind: testeCarga.tipo,
      sequence: testeCarga.numero,
      status,
      tested_at: testeCarga.data_inicio,
      responsible_id: testeCarga.responsavel_id,
      responsible_name: testeCarga.responsavel_nome,
      responsibles: [{ id: testeCarga.responsavel_id, nome: testeCarga.responsavel_nome }],
      result: testeCarga.item_resultado
        ? testeCarga.item_resultado.replaceAll('_', ' ')
        : testeCarga.status === 'cancelado'
          ? 'Teste cancelado'
          : `Teste ${testeCarga.status.replaceAll('_', ' ')}`,
      notes: [testeCarga.item_observacao, testeCarga.observacoes].filter(Boolean).join('\n\n') || null,
      segment: null,
      model: null,
      version: null,
      load_status: null,
      structure_status: null,
      needs_bench: null,
      needs_field: null,
      bench_solves: null,
      created_by: testeCarga.relatado_por,
      created_at: testeCarga.data_inicio,
      updated_at: testeCarga.data_inicio,
    })
  }

  const anexos = resultado.results.length
    ? await db.prepare(
        `SELECT id, test_id, file_name, tipo_mime, tamanho_bytes, created_at
         FROM ocorrencia_teste_anexos
         WHERE test_id IN (${resultado.results.map(() => '?').join(', ')})
           AND status_upload = 'pronto'
         ORDER BY created_at, id`,
      ).bind(...resultado.results.map(teste => teste.id)).all<{
        id: string
        test_id: string
        file_name: string
        tipo_mime: string
        tamanho_bytes: number
        created_at: string
      }>()
    : { results: [] }
  const responsaveis = resultado.results.length
    ? await db.prepare(
        `SELECT r.test_id, u.id, u.nome
         FROM ocorrencia_teste_responsaveis r
         JOIN usuarios u ON u.id = r.user_id
         WHERE r.test_id IN (${resultado.results.map(() => '?').join(', ')})
         ORDER BY u.nome COLLATE NOCASE`,
      ).bind(...resultado.results.map(teste => teste.id)).all<{
        test_id: string
        id: string
        nome: string
      }>()
    : { results: [] }
  const anexosPorTeste = new Map<string, typeof anexos.results>()
  for (const anexo of anexos.results) {
    const lista = anexosPorTeste.get(anexo.test_id) ?? []
    lista.push(anexo)
    anexosPorTeste.set(anexo.test_id, lista)
  }
  const responsaveisPorTeste = new Map<string, Array<{ id: string; nome: string }>>()
  for (const responsavel of responsaveis.results) {
    const lista = responsaveisPorTeste.get(responsavel.test_id) ?? []
    lista.push({ id: responsavel.id, nome: responsavel.nome })
    responsaveisPorTeste.set(responsavel.test_id, lista)
  }
  const testesComAnexos = testes.map(teste => ({
    ...teste,
    responsibles: teste.source === 'carga'
      ? [{ id: teste.responsible_id!, nome: teste.responsible_name! }]
      : responsaveisPorTeste.get(teste.id) ?? (
          teste.responsible_id && teste.responsible_name
            ? [{ id: teste.responsible_id, nome: teste.responsible_name }]
            : []
        ),
    attachments: teste.source === 'carga' ? [] : anexosPorTeste.get(teste.id) ?? [],
  }))
  testesComAnexos.sort((a, b) =>
    b.tested_at.localeCompare(a.tested_at) || b.sequence - a.sequence,
  )
  return { testes: testesComAnexos }
}

export async function criarTesteOcorrencia(
  db: D1Database,
  ocorrenciaId: string,
  usuario: UsuarioTesteOcorrencia,
  input: CriarTesteOcorrenciaInput,
): Promise<string> {
  await validarRelacao(db, ocorrenciaId, input.kind, usuario, input.responsibleIds)
  const id = crypto.randomUUID()
  const result = await db.batch([
    db.prepare(
    `INSERT INTO ocorrencia_testes (
       id, ocorrencia_id, kind, sequence, status, tested_at,
       responsible_id, result, notes, created_by, segment, model, version,
       load_status, structure_status, needs_bench, needs_field, bench_solves
     )
     VALUES (
       ?, ?, ?, COALESCE(
         (SELECT MAX(sequence) + 1 FROM ocorrencia_testes
          WHERE ocorrencia_id = ? AND kind = ?), 1
       ), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
     )`,
    ).bind(
    id,
    ocorrenciaId,
    input.kind,
    ocorrenciaId,
    input.kind,
    input.status,
    input.testedAt,
    input.responsibleIds[0]!,
    input.result,
    input.notes,
    usuario.id,
    input.segment,
    input.model,
    input.version,
    input.loadStatus,
    input.structureStatus,
    input.needsBench === null ? null : Number(input.needsBench),
    input.needsField === null ? null : Number(input.needsField),
      input.benchSolves === null ? null : Number(input.benchSolves),
    ),
    ...input.responsibleIds.map(userId => db.prepare(
      'INSERT INTO ocorrencia_teste_responsaveis (test_id, user_id) VALUES (?, ?)',
    ).bind(id, userId)),
  ])
  if (!result[0]?.success) throw createError({ statusCode: 500, statusMessage: 'Não foi possível criar o teste.' })
  return id
}

export async function atualizarTesteOcorrencia(
  db: D1Database,
  ocorrenciaId: string,
  testeId: string,
  usuario: UsuarioTesteOcorrencia,
  input: AtualizarTesteOcorrenciaInput,
): Promise<boolean> {
  const atual = await buscarTeste(db, testeId)
  if (!atual || atual.ocorrencia_id !== ocorrenciaId) return false
  exigirPermissao(usuario, atual.kind)
  if (input.kind && input.kind !== atual.kind) exigirPermissao(usuario, input.kind)
  if (input.responsibleIds) {
    const placeholders = input.responsibleIds.map(() => '?').join(', ')
    const responsaveis = await db.prepare(
      `SELECT id FROM usuarios WHERE id IN (${placeholders}) AND ativo = 1`,
    ).bind(...input.responsibleIds).all<{ id: string }>()
    if (responsaveis.results.length !== input.responsibleIds.length) {
      throw createError({ statusCode: 400, statusMessage: 'Um ou mais responsáveis selecionados não estão ativos.' })
    }
  }

  const values: unknown[] = []
  const columns: Partial<Record<keyof AtualizarTesteOcorrenciaInput, string>> = {
    kind: 'kind',
    status: 'status',
    testedAt: 'tested_at',
    result: 'result',
    notes: 'notes',
    segment: 'segment',
    model: 'model',
    version: 'version',
    loadStatus: 'load_status',
    structureStatus: 'structure_status',
    needsBench: 'needs_bench',
    needsField: 'needs_field',
    benchSolves: 'bench_solves',
  }
  for (const key of Object.keys(columns) as Array<keyof AtualizarTesteOcorrenciaInput>) {
    const value = input[key]
    if (value !== undefined) {
      values.push(typeof value === 'boolean' ? Number(value) : value)
    }
  }
  const assignments = (Object.keys(columns) as Array<keyof AtualizarTesteOcorrenciaInput>)
    .filter(key => input[key] !== undefined)
    .map(key => `${columns[key]} = ?`)
  if (input.responsibleIds) {
    assignments.push('responsible_id = ?')
    values.push(input.responsibleIds[0])
  }
  if (input.kind && input.kind !== atual.kind) {
    assignments.push(
      `sequence = (
        SELECT COALESCE(MAX(sequence), 0) + 1
        FROM ocorrencia_testes
        WHERE ocorrencia_id = ? AND kind = ?
      )`,
    )
    values.push(ocorrenciaId, input.kind)
  }
  if (!assignments.length && !input.responsibleIds) return true
  assignments.push("updated_at = datetime('now')")
  values.push(testeId, ocorrenciaId)
  const statements: D1PreparedStatement[] = [
    db.prepare(
      `UPDATE ocorrencia_testes SET ${assignments.join(', ')} WHERE id = ? AND ocorrencia_id = ?`,
    ).bind(...values),
  ]
  if (input.responsibleIds) {
    statements.push(
      db.prepare('DELETE FROM ocorrencia_teste_responsaveis WHERE test_id = ?').bind(testeId),
      ...input.responsibleIds.map(userId => db.prepare(
        'INSERT INTO ocorrencia_teste_responsaveis (test_id, user_id) VALUES (?, ?)',
      ).bind(testeId, userId)),
    )
  }
  const updated = await db.batch(statements)
  return (updated[0]?.meta.changes ?? 0) > 0
}

export async function excluirTesteOcorrencia(
  db: D1Database,
  ocorrenciaId: string,
  testeId: string,
  usuario: UsuarioTesteOcorrencia,
): Promise<boolean> {
  const atual = await buscarTeste(db, testeId)
  if (!atual || atual.ocorrencia_id !== ocorrenciaId) return false
  exigirPermissao(usuario, atual.kind)

  const anexos = await db.prepare(
    'SELECT file_path FROM ocorrencia_teste_anexos WHERE test_id = ?',
  ).bind(testeId).all<{ file_path: string }>()
  const statements = anexos.results.map(anexo =>
    db.prepare('DELETE FROM arquivo_partes WHERE chave_storage = ?').bind(anexo.file_path),
  )
  statements.push(db.prepare(
    'DELETE FROM ocorrencia_testes WHERE id = ? AND ocorrencia_id = ?',
  ).bind(testeId, ocorrenciaId))
  const result = await db.batch(statements)
  return (result.at(-1)?.meta.changes ?? 0) > 0
}

export async function obterTesteOcorrencia(
  db: D1Database,
  ocorrenciaId: string,
  testeId: string,
) {
  const teste = await buscarTeste(db, testeId)
  return teste?.ocorrencia_id === ocorrenciaId ? teste : null
}
