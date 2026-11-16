import type { LoadFunctionImportRow } from '../types/load-function-import'

export async function importarLinhasFuncoes(
  db: D1Database,
  codigoId: string,
  rows: LoadFunctionImportRow[],
): Promise<boolean> {
  const overview = await db.prepare(
    `SELECT id FROM load_overviews
     WHERE codigo_id = ? AND EXISTS (
       SELECT 1 FROM codigos WHERE id = ? AND excluido_em IS NULL
     )`,
  ).bind(codigoId, codigoId).first<{ id: string }>()
  if (!overview) return false

  const posicoes = new Map<string, number>()
  const statements: D1PreparedStatement[] = [
    db.prepare('DELETE FROM load_function_import_rows WHERE overview_id = ?').bind(overview.id),
  ]
  for (const row of rows) {
    const position = (posicoes.get(row.category) ?? 0) + 1
    posicoes.set(row.category, position)
    statements.push(db.prepare(
      `INSERT INTO load_function_import_rows (
         id, overview_id, category, position, version_ontime, function_type,
         function_dieseldiag, equipment_base, developed
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      crypto.randomUUID(),
      overview.id,
      row.category,
      position,
      row.versionOntime,
      row.functionType,
      row.functionDieseldiag,
      row.equipmentBase,
      row.developed,
    ))
  }
  await db.batch(statements)
  return true
}
