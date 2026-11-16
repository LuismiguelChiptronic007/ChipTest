import { getHeader, readMultipartFormData } from 'h3'
import { TAMANHO_MAXIMO_ANEXO_BYTES } from '@backend/services/ocorrencias-config'
import type { LoadFunctionImportRow } from '@backend/types/load-function-import'
import { importarLinhasFuncoes } from '@backend/services/load-function-import'
import { exigirGerenciarCodigos } from '../../../../../utils/codigos'
import { getDatabase } from '../../../../../utils/database'
import { ErroImportacaoPlanilha, analisarPlanilhaFuncoes } from '../../../../../utils/importacao-funcoes'
import { obterCodigoId } from '../../../../../utils/load-overview'

const TAMANHO_MAXIMO_FORMULARIO = TAMANHO_MAXIMO_ANEXO_BYTES + 1024 * 1024

export default defineEventHandler(async (event) => {
  await exigirGerenciarCodigos(event)
  const codigoId = obterCodigoId(event)
  const tamanhoCorpo = Number(getHeader(event, 'content-length') ?? 0)
  if (tamanhoCorpo > TAMANHO_MAXIMO_FORMULARIO) {
    throw createError({ statusCode: 413, statusMessage: 'A planilha deve ter no máximo 10 MB.' })
  }

  const partes = await readMultipartFormData(event) ?? []
  const arquivo = partes[0]
  if (partes.length !== 1 || arquivo?.name !== 'file' || !arquivo.filename) {
    throw createError({ statusCode: 400, statusMessage: 'Selecione uma única planilha Excel para importar.' })
  }
  const nome = arquivo.filename.toLocaleLowerCase('pt-BR')
  if (!nome.endsWith('.xlsx') && !nome.endsWith('.xlsm')) {
    throw createError({ statusCode: 400, statusMessage: 'Formato inválido. Envie uma planilha .xlsx ou .xlsm.' })
  }
  if (
    arquivo.data.byteLength < 4
    || arquivo.data.byteLength > TAMANHO_MAXIMO_ANEXO_BYTES
    || arquivo.data[0] !== 0x50
    || arquivo.data[1] !== 0x4b
  ) {
    throw createError({ statusCode: 400, statusMessage: 'O documento enviado não é uma planilha Excel válida ou excede 10 MB.' })
  }

  let rows: LoadFunctionImportRow[]
  try {
    rows = await analisarPlanilhaFuncoes(arquivo.data)
  } catch (cause: unknown) {
    if (cause instanceof ErroImportacaoPlanilha) {
      throw createError({ statusCode: 422, statusMessage: cause.message })
    }
    throw cause
  }

  const db = getDatabase(event)
  const imported = await importarLinhasFuncoes(db, codigoId, rows)
  if (!imported) throw createError({ statusCode: 404, statusMessage: 'DSD não encontrada.' })

  return { importedCount: rows.length }
})
