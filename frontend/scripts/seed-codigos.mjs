import { spawnSync } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const frontendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const temporaryDirectory = path.join(frontendDirectory, '.wrangler')
const sqlFile = path.join(temporaryDirectory, 'seed-codigos-temporario.sql')
const wranglerScript = path.join(frontendDirectory, 'node_modules', 'wrangler', 'bin', 'wrangler.js')
const clearOnly = process.argv.includes('--clear')

const vehicles = [
  ['Volkswagen', 'Golf GTI', '2.0 TSI EA888', 2024],
  ['Volkswagen', 'Polo GTS', '1.4 TSI EA211', 2023],
  ['Volkswagen', 'T-Cross Highline', '1.4 TSI EA211', 2025],
  ['Chevrolet', 'Onix Premier', '1.0 Turbo Ecotec', 2024],
  ['Chevrolet', 'Tracker RS', '1.2 Turbo Ecotec', 2025],
  ['Chevrolet', 'S10 High Country', '2.8 Duramax', 2023],
  ['Ford', 'Ranger Limited', '3.0 V6 Power Stroke', 2024],
  ['Ford', 'Bronco Sport', '2.0 EcoBoost', 2023],
  ['Ford', 'Territory Titanium', '1.5 EcoBoost', 2025],
  ['Toyota', 'Corolla Altis', '2.0 Dynamic Force', 2024],
  ['Toyota', 'Corolla Cross XRX', '2.0 Dynamic Force', 2025],
  ['Toyota', 'Hilux SRX', '2.8 turbodiesel', 2023],
  ['Honda', 'Civic Touring', '1.5 VTEC Turbo', 2024],
  ['Honda', 'HR-V Touring', '1.5 DI VTEC Turbo', 2025],
  ['Honda', 'City Hatchback', '1.5 i-VTEC', 2023],
  ['Fiat', 'Toro Ranch', '2.0 Multijet II', 2024],
  ['Fiat', 'Pulse Abarth', '1.3 Turbo 270', 2025],
  ['Fiat', 'Fastback Limited', '1.3 Turbo 270', 2023],
  ['Jeep', 'Compass Longitude', '1.3 T270', 2024],
  ['Jeep', 'Renegade Trailhawk', '1.3 T270', 2025],
  ['Jeep', 'Commander Overland', '2.0 turbodiesel', 2023],
  ['Hyundai', 'Creta Ultimate', '1.0 TGDI', 2024],
  ['Hyundai', 'Tucson GLS', '1.6 T-GDI', 2025],
  ['Hyundai', 'HB20 Platinum', '1.0 TGDI', 2023],
  ['Renault', 'Duster Iconic', '1.3 TCe', 2024],
  ['Renault', 'Kardian Premiere', '1.0 TCe', 2025],
  ['Nissan', 'Kicks Exclusive', '1.6 HR16DE', 2024],
  ['Nissan', 'Frontier Pro-4X', '2.3 dCi biturbo', 2023],
  ['Mitsubishi', 'Eclipse Cross HPE-S', '1.5 turbo', 2025],
  ['BMW', '320i M Sport', '2.0 TwinPower Turbo', 2024],
]

function sqlLiteral(value) {
  if (value === null || value === undefined) return 'NULL'
  return `'${String(value).replaceAll("'", "''")}'`
}

function uuid(index) {
  return `d3000000-0000-4000-8000-${String(index).padStart(12, '0')}`
}

const statements = clearOnly
  ? [
      `UPDATE codigos SET excluido_em = COALESCE(excluido_em, datetime('now')), atualizado_em = datetime('now')
       WHERE id IN (SELECT codigo_id FROM codigos_demo_seed)`,
    ]
  : vehicles.flatMap(([marca, modelo, motor, ano], index) => {
      const number = index + 1
      const id = uuid(number)
      const codigo = `CT-DEMO-${String(number).padStart(3, '0')}`
      const note = `Cadastro de demonstração ChipTest. Referência de catálogo para testes da lista e do painel.`
      return [
        `INSERT INTO codigos (id, codigo, marca, modelo, motor, ano, observacoes, criado_por, criado_em, atualizado_em, excluido_em)
         VALUES (${sqlLiteral(id)}, ${sqlLiteral(codigo)}, ${sqlLiteral(marca)}, ${sqlLiteral(modelo)}, ${sqlLiteral(motor)}, ${Number(ano)}, ${sqlLiteral(note)},
           (SELECT id FROM usuarios WHERE papel = 'admin' AND ativo = 1 ORDER BY criado_em LIMIT 1),
           datetime('now', '-${number * 7} hours'), datetime('now'), NULL)
         ON CONFLICT(id) DO UPDATE SET
           codigo = excluded.codigo, marca = excluded.marca, modelo = excluded.modelo, motor = excluded.motor,
           ano = excluded.ano, observacoes = excluded.observacoes, excluido_em = NULL, atualizado_em = datetime('now')`,
        `INSERT OR IGNORE INTO codigos_demo_seed (codigo_id) VALUES (${sqlLiteral(id)})`,
      ]
    })

await mkdir(temporaryDirectory, { recursive: true })
try {
  await writeFile(sqlFile, `${statements.join(';\n')};\n`, 'utf8')
  const result = spawnSync(
    process.execPath,
    [wranglerScript, 'd1', 'execute', 'chiptest-db', '--local', '--file', sqlFile, '--config', 'wrangler.jsonc'],
    { cwd: frontendDirectory, stdio: ['ignore', 'ignore', 'inherit'] },
  )
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
  console.log(clearOnly
    ? 'Os registros marcados pelo seed foram ocultados do catálogo local.'
    : `${vehicles.length} códigos de demonstração foram criados ou atualizados no D1 local.`)
} finally {
  await rm(sqlFile, { force: true })
}
