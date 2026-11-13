import { iniciarAnexoTesteOcorrenciaSchema } from '@backend/schemas/ocorrencia-testes'
import { MAXIMO_ANEXOS_POR_TESTE, TAMANHO_PARTE_ANEXO_BYTES } from '@backend/services/ocorrencias-config'
import { arquivoOcorrenciaValido } from '@backend/services/ocorrencias'
import { papelPodeTestar } from '@backend/services/testes'
import { obterTesteOcorrencia } from '@backend/services/ocorrencia-testes'
import { obterUsuario } from '../../../../../../utils/auth'
import { getDatabase } from '../../../../../../utils/database'

function nomeSeguro(nome: string): string {
  const semCaminho = nome.split(/[\\/]/).at(-1) ?? ''
  return semCaminho.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 255)
}

export default defineEventHandler(async (event) => {
  const usuario = await obterUsuario(event)
  const ocorrenciaId = getRouterParam(event, 'id')
  const testeId = getRouterParam(event, 'testId')
  if (
    !ocorrenciaId || !/^[0-9a-f-]{36}$/i.test(ocorrenciaId)
    || !testeId || !/^[0-9a-f-]{36}$/i.test(testeId)
  ) {
    throw createError({ statusCode: 400, statusMessage: 'Os identificadores do teste são inválidos.' })
  }
  const entrada = iniciarAnexoTesteOcorrenciaSchema.safeParse(await readBody(event))
  if (!entrada.success) {
    throw createError({
      statusCode: 400,
      statusMessage: entrada.error.issues[0]?.message ?? 'Os dados do anexo são inválidos.',
    })
  }
  const fileName = nomeSeguro(entrada.data.fileName)
  if (!fileName || !arquivoOcorrenciaValido(
    { nomeOriginal: fileName, tipoMime: entrada.data.tipoMime, tamanhoBytes: entrada.data.tamanhoBytes },
    TAMANHO_PARTE_ANEXO_BYTES * entrada.data.totalPartes,
  )) {
    throw createError({ statusCode: 400, statusMessage: 'O nome, tipo ou tamanho do arquivo não é permitido.' })
  }

  const db = getDatabase(event)
  const teste = await obterTesteOcorrencia(db, ocorrenciaId, testeId)
  if (!teste) throw createError({ statusCode: 404, statusMessage: 'Teste não encontrado.' })
  if (!papelPodeTestar(usuario.papel, teste.kind)) {
    throw createError({ statusCode: 403, statusMessage: 'Você não pode adicionar arquivos a este teste.' })
  }
  const quantidade = await db.prepare(
    'SELECT COUNT(*) AS total FROM ocorrencia_teste_anexos WHERE test_id = ?',
  ).bind(testeId).first<{ total: number }>()
  if ((quantidade?.total ?? 0) >= MAXIMO_ANEXOS_POR_TESTE) {
    throw createError({ statusCode: 409, statusMessage: `Cada teste pode ter no máximo ${MAXIMO_ANEXOS_POR_TESTE} arquivos.` })
  }

  const id = crypto.randomUUID()
  const filePath = crypto.randomUUID()
  await db.prepare(
    `INSERT INTO ocorrencia_teste_anexos (
       id, test_id, file_path, file_name, tipo_mime, tamanho_bytes, total_partes, status_upload
     ) VALUES (?, ?, ?, ?, ?, ?, ?, 'enviando')`,
  ).bind(
    id,
    testeId,
    filePath,
    fileName,
    entrada.data.tipoMime,
    entrada.data.tamanhoBytes,
    entrada.data.totalPartes,
  ).run()
  setResponseStatus(event, 201)
  return { id, tamanhoParte: TAMANHO_PARTE_ANEXO_BYTES }
})
