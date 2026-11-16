import type {
  AtualizarLoadFunctionInput,
  AtualizarLoadOverviewInput,
  CriarLoadFunctionInput,
  LinhasLoadFunctionInput,
} from '../schemas/load-overview'

const docs = ['simulacao', 'interpretacao', 'codigo_falhas', 'rg_dsd_12'] as const
const nomesCategoria = {
  basico: 'Básico',
  sensores: 'Sensores',
<<<<<<< HEAD
  atuadores: 'Atuadores',
  estados: 'Estados',
  ajustes: 'Ajustes',
=======
  estados: 'Estados',
>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3
  parametrizacoes: 'Parametrizações',
} as const

interface FuncaoRow {
  id: string
  overview_id: string
  category: keyof typeof nomesCategoria
  sequence: number
  title: string
  print_url: string | null
  created_at: string
}

async function garantirVisaoGeral(db: D1Database, codigoId: string) {
  const codigo = await db.prepare(
    'SELECT id FROM codigos WHERE id = ? AND excluido_em IS NULL',
  ).bind(codigoId).first<{ id: string }>()
  if (!codigo) return false

  await db.batch([
    db.prepare(
      `INSERT OR IGNORE INTO load_overviews (id, codigo_id, request_number)
       VALUES (?, ?, 1)`,
    ).bind(crypto.randomUUID(), codigoId),
    db.prepare(
      `INSERT OR IGNORE INTO load_overview_docs (id, overview_id, key, checked)
       SELECT lower(hex(randomblob(16))), id, ?, 0
       FROM load_overviews WHERE codigo_id = ?`,
    ).bind(docs[0], codigoId),
    ...docs.slice(1).map(key => db.prepare(
      `INSERT OR IGNORE INTO load_overview_docs (id, overview_id, key, checked)
       SELECT lower(hex(randomblob(16))), id, ?, 0
       FROM load_overviews WHERE codigo_id = ?`,
    ).bind(key, codigoId)),
  ])
  return true
}

export async function obterVisaoGeralCarga(db: D1Database, codigoId: string) {
  if (!await garantirVisaoGeral(db, codigoId)) return null

<<<<<<< HEAD
  const [codigo, overview, docsResult, funcoesResult, linhasResult, funcoesImportadasResult, ocorrenciasResult, testesResult, responsaveisResult] = await db.batch([
=======
  const [codigo, overview, docsResult, funcoesResult, linhasResult, testesResult, responsaveisResult] = await db.batch([
>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3
    db.prepare(
      `SELECT id, codigo, marca, modelo, motor FROM codigos
       WHERE id = ? AND excluido_em IS NULL`,
    ).bind(codigoId),
    db.prepare(
      `SELECT o.id, o.codigo_id, o.request_number, o.launched_on, o.responsible_id,
         u.nome AS responsible_name, o.demand_type, o.demand_status,
         o.sga_print_url, o.system_info_url, o.notes, o.created_at, o.updated_at
       FROM load_overviews o LEFT JOIN usuarios u ON u.id = o.responsible_id
       WHERE o.codigo_id = ?`,
    ).bind(codigoId),
    db.prepare(
      `SELECT key, checked FROM load_overview_docs
       WHERE overview_id = (SELECT id FROM load_overviews WHERE codigo_id = ?)
       ORDER BY key`,
    ).bind(codigoId),
    db.prepare(
      `SELECT id, overview_id, category, sequence, title, print_url, created_at
<<<<<<< HEAD
       FROM load_functions
       WHERE overview_id = (SELECT id FROM load_overviews WHERE codigo_id = ?)
=======
       FROM load_functions WHERE overview_id = (SELECT id FROM load_overviews WHERE codigo_id = ?)
>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3
       ORDER BY category, sequence`,
    ).bind(codigoId),
    db.prepare(
      `SELECT r.id, r.function_id, r.position, r.item, r.description, r.value
       FROM load_function_rows r
       JOIN load_functions f ON f.id = r.function_id
       WHERE f.overview_id = (SELECT id FROM load_overviews WHERE codigo_id = ?)
       ORDER BY f.category, f.sequence, r.position`,
    ).bind(codigoId),
    db.prepare(
<<<<<<< HEAD
      `SELECT id, overview_id, category, position, version_ontime, function_type,
         function_dieseldiag, equipment_base, developed
       FROM load_function_import_rows
       WHERE overview_id = (SELECT id FROM load_overviews WHERE codigo_id = ?)
       ORDER BY CASE category
         WHEN 'basico' THEN 1 WHEN 'sensores' THEN 2 WHEN 'estados' THEN 3
         WHEN 'atuadores' THEN 4 WHEN 'ajustes' THEN 5 WHEN 'parametrizacoes' THEN 6
         WHEN 'funcao_avancada' THEN 7 ELSE 8 END, position`,
    ).bind(codigoId),
    db.prepare(
      `SELECT id, titulo, status FROM ocorrencias
       WHERE codigo_id = ?
       ORDER BY criado_em DESC, titulo COLLATE NOCASE`,
    ).bind(codigoId),
    db.prepare(
      `SELECT t.id, t.ocorrencia_id, t.kind, t.sequence, t.tested_at, t.status,
         t.segment, t.model, t.version, t.load_status, t.structure_status,
         t.needs_bench, t.needs_field, t.bench_solves
=======
      `SELECT t.id, t.ocorrencia_id, t.kind, t.sequence, t.tested_at, t.status,
         t.segment, t.model, t.version, t.load_status, t.structure_status,
         t.needs_bench, t.needs_field, t.bench_solves, o.titulo AS error_title
>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3
       FROM ocorrencia_testes t
       JOIN ocorrencias o ON o.id = t.ocorrencia_id
       WHERE o.codigo_id = ?
       ORDER BY t.tested_at ASC, t.created_at ASC, t.sequence ASC`,
    ).bind(codigoId),
    db.prepare(
      `SELECT r.test_id, u.id AS user_id, u.nome
       FROM ocorrencia_teste_responsaveis r JOIN usuarios u ON u.id = r.user_id
       JOIN ocorrencia_testes t ON t.id = r.test_id
       JOIN ocorrencias o ON o.id = t.ocorrencia_id
       WHERE o.codigo_id = ?
       ORDER BY u.nome COLLATE NOCASE`,
    ).bind(codigoId),
  ])

  const codigoRow = codigo.results[0] as {
    id: string
    codigo: string
    marca: string
    modelo: string
    motor: string | null
  } | undefined
  const overviewRow = overview.results[0] as Record<string, unknown> | undefined
  if (!codigoRow || !overviewRow) return null

  const linhasPorFuncao = new Map<string, Array<Record<string, unknown>>>()
  for (const linha of linhasResult.results as Array<Record<string, unknown> & { function_id: string }>) {
    const atuais = linhasPorFuncao.get(linha.function_id) ?? []
    atuais.push(linha)
    linhasPorFuncao.set(linha.function_id, atuais)
  }
  const funcoes = (funcoesResult.results as FuncaoRow[]).map(funcao => ({
    ...funcao,
    rows: linhasPorFuncao.get(funcao.id) ?? [],
  }))
  const responsaveisPorTeste = new Map<string, Array<{ id: string; nome: string }>>()
  for (const responsavel of responsaveisResult.results as Array<{ test_id: string; user_id: string; nome: string }>) {
    const atuais = responsaveisPorTeste.get(responsavel.test_id) ?? []
    atuais.push({ id: responsavel.user_id, nome: responsavel.nome })
    responsaveisPorTeste.set(responsavel.test_id, atuais)
  }
  const testes = (testesResult.results as Array<Record<string, unknown> & { id: string }>).map(teste => ({
    ...teste,
    responsibles: responsaveisPorTeste.get(teste.id) ?? [],
  }))
  const usuarios = await db.prepare(
    'SELECT id, nome FROM usuarios WHERE ativo = 1 ORDER BY nome COLLATE NOCASE',
  ).all<{ id: string; nome: string }>()
  const counts = Object.fromEntries(
    Object.keys(nomesCategoria).map(category => [
      category,
      funcoes.filter(funcao => funcao.category === category).length,
    ]),
  )

  return {
    codigo: codigoRow,
    overview: overviewRow,
    docs: docsResult.results,
    functions: funcoes,
    functionCounts: counts,
<<<<<<< HEAD
    functionImportRows: funcoesImportadasResult.results,
    ocorrencias: ocorrenciasResult.results,
=======
>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3
    tests: testes,
    responsaveisDisponiveis: usuarios.results,
  }
}

export async function atualizarVisaoGeralCarga(
  db: D1Database,
  codigoId: string,
  input: AtualizarLoadOverviewInput,
) {
  if (!await garantirVisaoGeral(db, codigoId)) return false
  if (input.responsibleId) {
    const user = await db.prepare('SELECT id FROM usuarios WHERE id = ? AND ativo = 1')
      .bind(input.responsibleId).first<{ id: string }>()
    if (!user) throw createError({ statusCode: 400, statusMessage: 'O responsável selecionado não está ativo.' })
  }
  const result = await db.prepare(
    `UPDATE load_overviews SET request_number = ?, launched_on = ?, responsible_id = ?,
       demand_type = ?, demand_status = ?, sga_print_url = ?, system_info_url = ?,
       notes = ?, updated_at = datetime('now') WHERE codigo_id = ?`,
  ).bind(
    input.requestNumber,
    input.launchedOn,
    input.responsibleId,
    input.demandType,
    input.demandStatus,
    input.sgaPrintUrl,
    input.systemInfoUrl,
    input.notes,
    codigoId,
  ).run()
  return result.meta.changes > 0
}

export async function atualizarDocumentoVisaoGeral(
  db: D1Database,
  codigoId: string,
  key: (typeof docs)[number],
  checked: boolean,
) {
  if (!await garantirVisaoGeral(db, codigoId)) return false
  const result = await db.prepare(
    `UPDATE load_overview_docs SET checked = ?
     WHERE key = ? AND overview_id = (SELECT id FROM load_overviews WHERE codigo_id = ?)`,
  ).bind(checked ? 1 : 0, key, codigoId).run()
  return result.meta.changes > 0
}

export async function excluirVisaoGeralCarga(db: D1Database, codigoId: string) {
  const result = await db.prepare(
    'DELETE FROM load_overviews WHERE codigo_id = ?',
  ).bind(codigoId).run()
  return result.meta.changes > 0
}

export async function criarFuncaoCarga(db: D1Database, codigoId: string, input: CriarLoadFunctionInput) {
  if (!await garantirVisaoGeral(db, codigoId)) return null
  const id = crypto.randomUUID()
  const label = nomesCategoria[input.category]
  const row = await db.prepare(
    `INSERT INTO load_functions (id, overview_id, category, sequence, title, print_url)
     SELECT ?, o.id, ?, COALESCE(MAX(f.sequence), 0) + 1,
       COALESCE(?, ? || ' ' || printf('%02d', COALESCE(MAX(f.sequence), 0) + 1)), ?
     FROM load_overviews o
     LEFT JOIN load_functions f ON f.overview_id = o.id AND f.category = ?
     WHERE o.codigo_id = ?
     RETURNING id`,
  ).bind(
    id, input.category, input.title ?? null, label, input.printUrl, input.category, codigoId,
  ).first<{ id: string }>()
  return row?.id ?? null
}

export async function atualizarFuncaoCarga(
  db: D1Database,
  codigoId: string,
  functionId: string,
  input: AtualizarLoadFunctionInput,
) {
  const assignments: string[] = []
  const values: unknown[] = []
  if (input.title !== undefined) {
    assignments.push('title = ?')
    values.push(input.title)
  }
  if (input.printUrl !== undefined) {
    assignments.push('print_url = ?')
    values.push(input.printUrl)
  }
  if (!assignments.length) return true
  values.push(functionId, codigoId)
  const result = await db.prepare(
    `UPDATE load_functions SET ${assignments.join(', ')}
     WHERE id = ? AND overview_id = (SELECT id FROM load_overviews WHERE codigo_id = ?)`,
  ).bind(...values).run()
  return result.meta.changes > 0
}

export async function excluirFuncaoCarga(db: D1Database, codigoId: string, functionId: string) {
  const result = await db.prepare(
    `DELETE FROM load_functions
     WHERE id = ? AND overview_id = (SELECT id FROM load_overviews WHERE codigo_id = ?)`,
  ).bind(functionId, codigoId).run()
  return result.meta.changes > 0
}

export async function salvarLinhasFuncaoCarga(
  db: D1Database,
  codigoId: string,
  functionId: string,
  input: LinhasLoadFunctionInput,
) {
  const pertence = await db.prepare(
    `SELECT f.id FROM load_functions f
     JOIN load_overviews o ON o.id = f.overview_id
     WHERE f.id = ? AND o.codigo_id = ?`,
  ).bind(functionId, codigoId).first<{ id: string }>()
  if (!pertence) return false
  const statements: D1PreparedStatement[] = [
    db.prepare('DELETE FROM load_function_rows WHERE function_id = ?').bind(functionId),
    ...input.rows.map((row, index) => db.prepare(
      `INSERT INTO load_function_rows (id, function_id, position, item, description, value)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).bind(crypto.randomUUID(), functionId, index + 1, row.item, row.description, row.value)),
  ]
  await db.batch(statements)
  return true
}
