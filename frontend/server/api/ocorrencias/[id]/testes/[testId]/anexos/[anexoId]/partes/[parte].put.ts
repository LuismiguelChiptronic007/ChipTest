import { parteAnexoTesteOcorrenciaSchema, type TipoMimeAnexoTesteOcorrencia } from '@backend/schemas/ocorrencia-testes'
import { TAMANHO_PARTE_ANEXO_BYTES } from '@backend/services/ocorrencias-config'
import { papelPodeTestar } from '@backend/services/testes'
import { obterTesteOcorrencia } from '@backend/services/ocorrencia-testes'
import {
  decodificarParteAnexo,
  excluirArquivoD1,
  gravarParteArquivoD1,
  validarTextoArquivoD1,
  validarConteudoAnexo,
} from '../../../../../../../../utils/arquivos-d1'
import { obterUsuario } from '../../../../../../../../utils/auth'
import { getDatabase } from '../../../../../../../../utils/database'

export default defineEventHandler(async (event) => {
  const usuario = await obterUsuario(event)
  const ocorrenciaId = getRouterParam(event, 'id')
  const testeId = getRouterParam(event, 'testId')
  const anexoId = getRouterParam(event, 'anexoId')
  const parteNumero = Number(getRouterParam(event, 'parte'))
  if (
    !ocorrenciaId || !/^[0-9a-f-]{36}$/i.test(ocorrenciaId)
    || !testeId || !/^[0-9a-f-]{36}$/i.test(testeId)
    || !anexoId || !/^[0-9a-f-]{36}$/i.test(anexoId)
    || !Number.isInteger(parteNumero) || parteNumero < 0
  ) {
    throw createError({ statusCode: 400, statusMessage: 'Os identificadores do envio são inválidos.' })
  }
  const entrada = parteAnexoTesteOcorrenciaSchema.safeParse({ ...await readBody(event), numeroParte: parteNumero })
  if (!entrada.success) {
    throw createError({ statusCode: 400, statusMessage: entrada.error.issues[0]?.message ?? 'A parte do arquivo é inválida.' })
  }
  const db = getDatabase(event)
  const [teste, anexo] = await Promise.all([
    obterTesteOcorrencia(db, ocorrenciaId, testeId),
    db.prepare(
      `SELECT id, file_path, file_name, tipo_mime, tamanho_bytes, total_partes, status_upload
       FROM ocorrencia_teste_anexos WHERE id = ? AND test_id = ?`,
    ).bind(anexoId, testeId).first<{
      id: string
      file_path: string
      file_name: string
      tipo_mime: TipoMimeAnexoTesteOcorrencia
      tamanho_bytes: number
      total_partes: number
      status_upload: 'enviando' | 'pronto'
    }>(),
  ])
  if (!teste || !anexo) throw createError({ statusCode: 404, statusMessage: 'Teste ou arquivo não encontrado.' })
  if (!papelPodeTestar(usuario.papel, teste.kind)) {
    throw createError({ statusCode: 403, statusMessage: 'Você não pode enviar arquivos para este teste.' })
  }
  if (anexo.status_upload === 'pronto') return { sucesso: true, concluido: true }
  if (parteNumero >= anexo.total_partes) {
    throw createError({ statusCode: 400, statusMessage: 'O número da parte excede o tamanho informado.' })
  }

  const bytes = decodificarParteAnexo(entrada.data.conteudoBase64)
  const tamanhoEsperado = Math.min(
    TAMANHO_PARTE_ANEXO_BYTES,
    anexo.tamanho_bytes - parteNumero * TAMANHO_PARTE_ANEXO_BYTES,
  )
  if (bytes.byteLength !== tamanhoEsperado) {
    throw createError({ statusCode: 400, statusMessage: 'O tamanho da parte recebida não corresponde ao arquivo.' })
  }
  if (
    parteNumero === 0
    && anexo.tipo_mime !== 'text/plain'
    && !validarConteudoAnexo(anexo.file_name, anexo.tipo_mime, bytes)
  ) {
    await excluirArquivoD1(db, anexo.file_path)
    await db.prepare('DELETE FROM ocorrencia_teste_anexos WHERE id = ?').bind(anexo.id).run()
    throw createError({ statusCode: 400, statusMessage: 'O conteúdo do arquivo não corresponde ao tipo declarado.' })
  }

  await gravarParteArquivoD1(db, anexo.file_path, parteNumero, entrada.data.conteudoBase64)
  const contagem = await db.prepare(
    'SELECT COUNT(*) AS total FROM arquivo_partes WHERE chave_storage = ?',
  ).bind(anexo.file_path).first<{ total: number }>()
  if ((contagem?.total ?? 0) < anexo.total_partes) {
    return { sucesso: true, concluido: false, partesRecebidas: contagem?.total ?? 0, totalPartes: anexo.total_partes }
  }

  if (
    anexo.tipo_mime === 'text/plain'
    && !await validarTextoArquivoD1(db, anexo.file_path, anexo.total_partes)
  ) {
    await excluirArquivoD1(db, anexo.file_path)
    await db.prepare('DELETE FROM ocorrencia_teste_anexos WHERE id = ?').bind(anexo.id).run()
    throw createError({ statusCode: 400, statusMessage: 'O arquivo de texto contém dados inválidos ou não está codificado em UTF-8.' })
  }
  await db.prepare(
    `UPDATE ocorrencia_teste_anexos SET status_upload = 'pronto'
     WHERE id = ? AND status_upload = 'enviando'`,
  ).bind(anexo.id).run()
  return { sucesso: true, concluido: true }
})
