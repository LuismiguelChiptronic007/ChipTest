import { parteAnexoSchema } from '@backend/schemas/ocorrencias'
import type { TipoMimeAnexo } from '@backend/services/ocorrencias-config'
import { TAMANHO_PARTE_ANEXO_BYTES } from '@backend/services/ocorrencias-config'
import { papelPodeEditarConteudoOcorrencia } from '@backend/services/ocorrencias'
import {
  decodificarParteAnexo,
  excluirArquivoD1,
  gravarParteArquivoD1,
  validarTextoArquivoD1,
  validarConteudoAnexo,
} from '../../../../../../utils/arquivos-d1'
import { obterUsuario } from '../../../../../../utils/auth'
import { getDatabase } from '../../../../../../utils/database'

export default defineEventHandler(async (event) => {
  const usuario = await obterUsuario(event)
  const ocorrenciaId = getRouterParam(event, 'id')
  const anexoId = getRouterParam(event, 'anexoId')
  const parteNumero = Number(getRouterParam(event, 'parte'))
  if (
    !ocorrenciaId || !/^[0-9a-f-]{36}$/i.test(ocorrenciaId)
    || !anexoId || !/^[0-9a-f-]{36}$/i.test(anexoId)
    || !Number.isInteger(parteNumero) || parteNumero < 0
  ) {
    throw createError({ statusCode: 400, statusMessage: 'Os identificadores do envio são inválidos.' })
  }
  const entrada = parteAnexoSchema.safeParse({ ...await readBody(event), numeroParte: parteNumero })
  if (!entrada.success) {
    throw createError({ statusCode: 400, statusMessage: entrada.error.issues[0]?.message ?? 'A parte do arquivo é inválida.' })
  }

  const db = getDatabase(event)
  const anexo = await db.prepare(
    `SELECT a.id, a.chave_storage, a.nome_original, a.tipo_mime, a.tamanho_bytes,
       a.total_partes, a.status_upload, o.relatado_por
     FROM anexos a JOIN ocorrencias o ON o.id = a.ocorrencia_id
     WHERE a.id = ? AND a.ocorrencia_id = ?`,
  ).bind(anexoId, ocorrenciaId).first<{
    id: string
    chave_storage: string
    nome_original: string
    tipo_mime: TipoMimeAnexo
    tamanho_bytes: number
    total_partes: number
    status_upload: 'enviando' | 'pronto'
    relatado_por: string
  }>()
  if (!anexo) throw createError({ statusCode: 404, statusMessage: 'Anexo não encontrado.' })
  if (!papelPodeEditarConteudoOcorrencia(usuario.papel, usuario.id, anexo.relatado_por)) {
    throw createError({ statusCode: 403, statusMessage: 'Você não pode enviar arquivos para esta ocorrência.' })
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
    && !validarConteudoAnexo(anexo.nome_original, anexo.tipo_mime, bytes)
  ) {
    await excluirArquivoD1(db, anexo.chave_storage)
    await db.prepare('DELETE FROM anexos WHERE id = ?').bind(anexo.id).run()
    throw createError({ statusCode: 400, statusMessage: 'O conteúdo do arquivo não corresponde ao tipo declarado.' })
  }

  await gravarParteArquivoD1(db, anexo.chave_storage, parteNumero, entrada.data.conteudoBase64)
  const contagem = await db.prepare(
    'SELECT COUNT(*) AS total FROM arquivo_partes WHERE chave_storage = ?',
  ).bind(anexo.chave_storage).first<{ total: number }>()
  if ((contagem?.total ?? 0) < anexo.total_partes) {
    return { sucesso: true, concluido: false, partesRecebidas: contagem?.total ?? 0, totalPartes: anexo.total_partes }
  }

  const textoValido = anexo.tipo_mime !== 'text/plain'
    || await validarTextoArquivoD1(db, anexo.chave_storage, anexo.total_partes)
  if (!textoValido) {
    await excluirArquivoD1(db, anexo.chave_storage)
    await db.prepare('DELETE FROM anexos WHERE id = ?').bind(anexo.id).run()
    throw createError({ statusCode: 400, statusMessage: 'O arquivo de texto contém dados inválidos ou não está codificado em UTF-8.' })
  }
  await db.prepare(
    `UPDATE anexos SET status_upload = 'pronto'
     WHERE id = ? AND status_upload = 'enviando'`,
  ).bind(anexo.id).run()
  return { sucesso: true, concluido: true }
})
