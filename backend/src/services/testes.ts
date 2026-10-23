import type {
  AtualizarItemTesteInput,
  CriarTesteInput,
  ResultadoTesteItem,
  StatusTeste,
  TipoSecaoTeste,
  TipoTeste,
} from '../schemas/testes'

export type PapelTeste = 'admin' | 'engenharia' | 'bancada' | 'campo'

export interface TesteRecord {
  id: string
  codigo_id: string
  codigo: string
  marca: string
  modelo: string
  tipo: TipoTeste
  numero: number
  responsavel_id: string
  responsavel_nome: string
  veiculo_info: string | null
  data_inicio: string
  data_fim: string | null
  status: StatusTeste
  observacoes: string | null
}

export interface TesteItemRecord {
  id: string
  codigo_item_id: string | null
  tipo_secao: TipoSecaoTeste
  nome_snapshot: string
  ordem: number
  resultado: ResultadoTesteItem
  observacao: string | null
  testado_por: string | null
  testado_em: string | null
}

export interface ResultadoTeste {
  resultado: ResultadoTesteItem
  observacao: string | null
}

interface TesteTimelineRow {
  id: string
  tipo: TipoTeste
  numero: number
  status: StatusTeste
  data_inicio: string
  data_fim: string | null
  veiculo_info: string | null
  responsavel_nome: string
  total_itens: number | null
  itens_testados: number | null
  itens_aprovados: number | null
  itens_reprovados: number | null
}

interface UltimoResultadoRow {
  codigo_item_id: string
  nome_snapshot: string
  tipo: TipoTeste
  numero: number
  status_teste: StatusTeste
  resultado: ResultadoTesteItem
  data_inicio: string
}

interface ComparacaoRow {
  codigo_item_id: string
  nome_snapshot: string
  numero_campo: number
  numero_bancada_reprovado: number
}

export function papelPodeTestar(papel: PapelTeste, tipo: TipoTeste): boolean {
  return papel === 'admin' || papel === 'engenharia' || papel === tipo
}

export function papelPodeEditarTeste(papel: PapelTeste, tipo: TipoTeste, status: StatusTeste): boolean {
  return papel === 'admin' || (papelPodeTestar(papel, tipo) && status === 'em_andamento')
}

export function proximoNumeroTeste(ultimosNumeros: number[]): number {
  return ultimosNumeros.reduce((maior, numero) => Math.max(maior, numero), 0) + 1
}

export function criarSnapshotsItensTeste(
  itens: Array<{ id: string; tipo_secao: TipoSecaoTeste; nome_completo: string; ordem: number }>,
) {
  return itens.map(item => ({
    codigo_item_id: item.id,
    tipo_secao: item.tipo_secao,
    nome_snapshot: item.nome_completo,
    ordem: item.ordem,
  }))
}

export function sugerirStatusTeste(itens: Array<{ resultado: ResultadoTesteItem }>): Exclude<StatusTeste, 'em_andamento'> {
  if (itens.some(item => item.resultado === 'reprovado')) return 'reprovado'
  if (!itens.length) return 'cancelado'
  if (itens.every(item => item.resultado === 'aprovado' || item.resultado === 'nao_se_aplica')) return 'aprovado'
  return 'cancelado'
}

export async function sugerirNumeroTeste(db: D1Database, codigoId: string, tipo: TipoTeste): Promise<number> {
  const resultado = await db.prepare(
    'SELECT COALESCE(MAX(numero), 0) AS maior FROM testes WHERE codigo_id = ? AND tipo = ?',
  ).bind(codigoId, tipo).first<{ maior: number }>()
  return proximoNumeroTeste(resultado ? [resultado.maior] : [])
}

export async function criarTeste(
  db: D1Database,
  codigoId: string,
  input: CriarTesteInput,
  usuarioId: string,
): Promise<{ id: string; numero: number }> {
  const [codigo, responsavel] = await Promise.all([
    db.prepare('SELECT id FROM codigos WHERE id = ? AND excluido_em IS NULL').bind(codigoId).first<{ id: string }>(),
    db.prepare('SELECT id FROM usuarios WHERE id = ? AND ativo = 1').bind(input.responsavelId ?? usuarioId).first<{ id: string }>(),
  ])
  if (!codigo) throw createError({ statusCode: 404, statusMessage: 'Código não encontrado.' })
  if (!responsavel) throw createError({ statusCode: 400, statusMessage: 'O responsável selecionado não está ativo.' })

  const numero = await sugerirNumeroTeste(db, codigoId, input.tipo)
  const itens = await db.prepare(
    `SELECT id, tipo_secao, nome_completo, ordem FROM codigo_itens
     WHERE codigo_id = ? AND ativo = 1 ORDER BY
       CASE tipo_secao WHEN 'dados_central' THEN 1 WHEN 'sensores' THEN 2 WHEN 'estados' THEN 3
         WHEN 'atuadores' THEN 4 WHEN 'ajuste' THEN 5 WHEN 'parametrizacao' THEN 6
         WHEN 'funcao_avancada' THEN 7 WHEN 'falhas' THEN 8 ELSE 9 END, ordem, id`,
  ).bind(codigoId).all<{
    id: string
    tipo_secao: TipoSecaoTeste
    nome_completo: string
    ordem: number
  }>()

  const id = crypto.randomUUID()
  const statements = [
    db.prepare(
      `INSERT INTO testes
         (id, codigo_id, tipo, numero, responsavel_id, veiculo_info, data_inicio, data_fim, status, observacoes, criado_em)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), NULL, 'em_andamento', ?, datetime('now'))`,
    ).bind(id, codigoId, input.tipo, numero, responsavel.id, input.veiculoInfo ?? null, input.observacoes ?? null),
    ...criarSnapshotsItensTeste(itens.results ?? []).map(item => db.prepare(
      `INSERT INTO teste_itens
         (id, teste_id, codigo_item_id, tipo_secao, nome_snapshot, ordem, resultado, observacao, testado_por, testado_em)
       VALUES (?, ?, ?, ?, ?, ?, 'nao_testado', NULL, NULL, NULL)`,
    ).bind(crypto.randomUUID(), id, item.codigo_item_id, item.tipo_secao, item.nome_snapshot, item.ordem)),
  ]
  await db.batch(statements)
  return { id, numero }
}

export async function buscarTeste(db: D1Database, id: string): Promise<{ teste: TesteRecord; itens: TesteItemRecord[] } | null> {
  const teste = await db.prepare(
    `SELECT t.id, t.codigo_id, c.codigo, c.marca, c.modelo, t.tipo, t.numero,
       t.responsavel_id, u.nome AS responsavel_nome, t.veiculo_info, t.data_inicio, t.data_fim,
       t.status, t.observacoes
     FROM testes t
     JOIN codigos c ON c.id = t.codigo_id
     JOIN usuarios u ON u.id = t.responsavel_id
     WHERE t.id = ?`,
  ).bind(id).first<TesteRecord>()
  if (!teste) return null
  const itensResult = await db.prepare(
    `SELECT id, codigo_item_id, tipo_secao, nome_snapshot, ordem, resultado,
       observacao, testado_por, testado_em
     FROM teste_itens WHERE teste_id = ?
     ORDER BY CASE tipo_secao WHEN 'dados_central' THEN 1 WHEN 'sensores' THEN 2
       WHEN 'estados' THEN 3 WHEN 'atuadores' THEN 4 WHEN 'ajuste' THEN 5
       WHEN 'parametrizacao' THEN 6 WHEN 'funcao_avancada' THEN 7 WHEN 'falhas' THEN 8 ELSE 9 END,
       ordem, id`,
  ).bind(id).all<TesteItemRecord>()
  return { teste, itens: itensResult.results ?? [] }
}

export async function listarResponsaveis(db: D1Database) {
  const resultado = await db.prepare(
    `SELECT u.id, u.nome, u.papel, s.nome AS setor
     FROM usuarios u JOIN setores s ON s.id = u.setor_id
     WHERE u.ativo = 1 ORDER BY u.nome COLLATE NOCASE`,
  ).all<{ id: string; nome: string; papel: PapelTeste; setor: string }>()
  return resultado.results ?? []
}

export async function listarTestesCodigo(db: D1Database, codigoId: string) {
  const [testsResult, itensResult, comparacoesResult] = await Promise.all([
    db.prepare(
      `SELECT t.id, t.tipo, t.numero, t.status, t.data_inicio, t.data_fim, t.veiculo_info,
         u.nome AS responsavel_nome,
         COUNT(ti.id) AS total_itens,
         SUM(CASE WHEN ti.resultado <> 'nao_testado' THEN 1 ELSE 0 END) AS itens_testados,
         SUM(CASE WHEN ti.resultado = 'aprovado' THEN 1 ELSE 0 END) AS itens_aprovados,
         SUM(CASE WHEN ti.resultado = 'reprovado' THEN 1 ELSE 0 END) AS itens_reprovados
       FROM testes t JOIN usuarios u ON u.id = t.responsavel_id
       LEFT JOIN teste_itens ti ON ti.teste_id = t.id
       WHERE t.codigo_id = ?
       GROUP BY t.id ORDER BY t.data_inicio DESC, t.numero DESC`,
    ).bind(codigoId).all<TesteTimelineRow>(),
    db.prepare(
      `WITH classificados AS (
         SELECT ti.codigo_item_id, ti.nome_snapshot, t.tipo, t.numero, t.status AS status_teste,
           ti.resultado, t.data_inicio,
           ROW_NUMBER() OVER (PARTITION BY ti.codigo_item_id, t.tipo
             ORDER BY t.data_inicio DESC, t.numero DESC, ti.id DESC) AS rn
         FROM teste_itens ti JOIN testes t ON t.id = ti.teste_id
         WHERE t.codigo_id = ? AND ti.codigo_item_id IS NOT NULL
       )
       SELECT codigo_item_id, nome_snapshot, tipo, numero, status_teste, resultado, data_inicio
       FROM classificados WHERE rn = 1`,
    ).bind(codigoId).all<UltimoResultadoRow>(),
    db.prepare(
      `WITH campo_ok AS (
         SELECT ti.codigo_item_id, ti.nome_snapshot, t.numero, t.data_inicio,
           ROW_NUMBER() OVER (PARTITION BY ti.codigo_item_id ORDER BY t.data_inicio DESC, t.numero DESC) AS rn
         FROM teste_itens ti JOIN testes t ON t.id = ti.teste_id
         WHERE t.codigo_id = ? AND t.tipo = 'campo' AND t.status = 'aprovado'
           AND ti.resultado = 'aprovado'
       )
       SELECT DISTINCT campo_ok.codigo_item_id, campo_ok.nome_snapshot,
         campo_ok.numero AS numero_campo,
         (SELECT MAX(tb.numero) FROM teste_itens tib JOIN testes tb ON tb.id = tib.teste_id
          WHERE tb.codigo_id = ? AND tb.tipo = 'bancada' AND tb.status = 'reprovado'
            AND tib.codigo_item_id = campo_ok.codigo_item_id AND tib.resultado = 'reprovado') AS numero_bancada_reprovado
       FROM campo_ok WHERE campo_ok.rn = 1
         AND EXISTS (SELECT 1 FROM teste_itens tib JOIN testes tb ON tb.id = tib.teste_id
           WHERE tb.codigo_id = ? AND tb.tipo = 'bancada' AND tb.status = 'reprovado'
             AND tib.codigo_item_id = campo_ok.codigo_item_id AND tib.resultado = 'reprovado')
       ORDER BY campo_ok.nome_snapshot COLLATE NOCASE`,
    ).bind(codigoId, codigoId, codigoId).all<ComparacaoRow>(),
  ])

  const testes = (testsResult.results ?? []).map(row => {
    const itens = Number(row.total_itens ?? 0)
    const testados = Number(row.itens_testados ?? 0)
    const aprovados = Number(row.itens_aprovados ?? 0)
    return {
      ...row,
      total_itens: itens,
      itens_testados: testados,
      itens_aprovados: aprovados,
      itens_reprovados: Number(row.itens_reprovados ?? 0),
      percentual_aprovado: testados ? Math.round(aprovados / testados * 100) : 0,
    }
  })
  return {
    testes,
    ultimos_resultados: (itensResult.results ?? []).map(row => ({
      codigo_item_id: row.codigo_item_id,
      tipo: row.tipo,
      numero: row.numero,
      status_teste: row.status_teste,
      resultado: row.resultado,
      data_inicio: row.data_inicio,
    })),
    comparacoes: comparacoesResult.results ?? [],
  }
}

export async function listarTestes(db: D1Database, status?: StatusTeste) {
  const filtro = status ? 'AND t.status = ?' : ''
  const statement = db.prepare(
    `SELECT t.id, t.codigo_id, c.codigo, c.marca, c.modelo, t.tipo, t.numero,
       t.status, t.data_inicio, t.data_fim, u.nome AS responsavel_nome,
       COUNT(ti.id) AS total_itens,
       SUM(CASE WHEN ti.resultado <> 'nao_testado' THEN 1 ELSE 0 END) AS itens_testados,
       SUM(CASE WHEN ti.resultado = 'aprovado' THEN 1 ELSE 0 END) AS itens_aprovados,
       SUM(CASE WHEN ti.resultado = 'reprovado' THEN 1 ELSE 0 END) AS itens_reprovados
     FROM testes t
     JOIN codigos c ON c.id = t.codigo_id
     JOIN usuarios u ON u.id = t.responsavel_id
     LEFT JOIN teste_itens ti ON ti.teste_id = t.id
     WHERE c.excluido_em IS NULL ${filtro}
     GROUP BY t.id
     ORDER BY CASE WHEN t.status = 'em_andamento' THEN 0 ELSE 1 END,
       t.data_inicio DESC, t.numero DESC LIMIT 100`,
  )
  const resultado = await (status ? statement.bind(status) : statement).all<TesteTimelineRow & {
    codigo_id: string
    codigo: string
    marca: string
    modelo: string
  }>()
  return (resultado.results ?? []).map(row => {
    const total = Number(row.total_itens ?? 0)
    const testados = Number(row.itens_testados ?? 0)
    const aprovados = Number(row.itens_aprovados ?? 0)
    return {
      ...row,
      total_itens: total,
      itens_testados: testados,
      itens_aprovados: aprovados,
      itens_reprovados: Number(row.itens_reprovados ?? 0),
      percentual_aprovado: testados ? Math.round(aprovados / testados * 100) : 0,
    }
  })
}

export async function atualizarItensTeste(
  db: D1Database,
  testeId: string,
  atualizacoes: Array<{ id: string } & AtualizarItemTesteInput>,
  usuarioId: string,
  logarHistorico: boolean,
): Promise<void> {
  const ids = [...new Set(atualizacoes.map(item => item.id))]
  if (ids.length !== atualizacoes.length) {
    throw createError({ statusCode: 400, statusMessage: 'A lista contém itens repetidos.' })
  }
  const existentes = await db.prepare(
    `SELECT id, codigo_item_id, tipo_secao, nome_snapshot, ordem, resultado, observacao
     FROM teste_itens WHERE teste_id = ? AND id IN (${ids.map(() => '?').join(', ')})`,
  ).bind(testeId, ...ids).all<TesteItemRecord>()
  if ((existentes.results ?? []).length !== ids.length) {
    throw createError({ statusCode: 404, statusMessage: 'Um ou mais itens não pertencem a este teste.' })
  }

  const statements: D1PreparedStatement[] = []
  for (const atualizacao of atualizacoes) {
    const anterior = existentes.results.find(item => item.id === atualizacao.id)!
    const observacao = atualizacao.observacao?.trim() || null
    statements.push(db.prepare(
      `UPDATE teste_itens SET resultado = ?, observacao = ?,
         testado_por = CASE WHEN ? = 'nao_testado' THEN NULL ELSE ? END,
         testado_em = CASE WHEN ? = 'nao_testado' THEN NULL ELSE datetime('now') END
       WHERE id = ? AND teste_id = ?`,
    ).bind(atualizacao.resultado, observacao, atualizacao.resultado, usuarioId, atualizacao.resultado, atualizacao.id, testeId))

    if (logarHistorico) {
      statements.push(db.prepare(
        `INSERT INTO historico_alteracoes (id, tabela, registro_id, usuario_id, antes, depois)
         VALUES (?, 'teste_itens', ?, ?, ?, ?)`,
      ).bind(
        crypto.randomUUID(),
        atualizacao.id,
        usuarioId,
        JSON.stringify({ ...anterior }),
        JSON.stringify({ ...anterior, resultado: atualizacao.resultado, observacao }),
      ))
    }
  }
  await db.batch(statements)
}

export async function finalizarTeste(
  db: D1Database,
  testeId: string,
  status: Exclude<StatusTeste, 'em_andamento'>,
  usuarioId: string,
  admin: boolean,
): Promise<boolean> {
  const anterior = await db.prepare(
    'SELECT id, status, data_fim FROM testes WHERE id = ?',
  ).bind(testeId).first<{ id: string; status: StatusTeste; data_fim: string | null }>()
  if (!anterior) return false
  const statements: D1PreparedStatement[] = [
    db.prepare(
      `UPDATE testes SET status = ?, data_fim = datetime('now')
       WHERE id = ? AND (status = 'em_andamento' OR ?)`,
    ).bind(status, testeId, admin ? 1 : 0),
  ]
  if (anterior.status !== status) {
    statements.push(db.prepare(
      `INSERT INTO historico_alteracoes (id, tabela, registro_id, usuario_id, antes, depois)
       VALUES (?, 'testes', ?, ?, ?, ?)`,
    ).bind(
      crypto.randomUUID(),
      testeId,
      usuarioId,
      JSON.stringify(anterior),
      JSON.stringify({ status, data_fim: new Date().toISOString() }),
    ))
  }
  const resultados = await db.batch(statements)
  return Number(resultados[0]?.meta.changes ?? 0) > 0 || anterior.status === status
}

export async function atualizarMetadadosTeste(
  db: D1Database,
  testeId: string,
  input: { veiculoInfo?: string | null; observacoes?: string | null },
  usuarioId: string,
  admin: boolean,
): Promise<boolean> {
  const anterior = await db.prepare(
    'SELECT id, veiculo_info, observacoes, status FROM testes WHERE id = ?',
  ).bind(testeId).first<{
    id: string
    veiculo_info: string | null
    observacoes: string | null
    status: StatusTeste
  }>()
  if (!anterior) return false
  const veiculoInfo = input.veiculoInfo === undefined ? anterior.veiculo_info : input.veiculoInfo
  const observacoes = input.observacoes === undefined ? anterior.observacoes : input.observacoes
  const statements: D1PreparedStatement[] = [
    db.prepare(
      `UPDATE testes SET veiculo_info = ?, observacoes = ?
       WHERE id = ? AND (status = 'em_andamento' OR ?)`,
    ).bind(veiculoInfo, observacoes, testeId, admin ? 1 : 0),
  ]
  if (admin && anterior.status !== 'em_andamento') {
    statements.push(db.prepare(
      `INSERT INTO historico_alteracoes (id, tabela, registro_id, usuario_id, antes, depois)
       VALUES (?, 'testes', ?, ?, ?, ?)`,
    ).bind(
      crypto.randomUUID(),
      testeId,
      usuarioId,
      JSON.stringify(anterior),
      JSON.stringify({ ...anterior, veiculo_info: veiculoInfo, observacoes }),
    ))
  }
  const resultados = await db.batch(statements)
  return Number(resultados[0]?.meta.changes ?? 0) > 0
}
