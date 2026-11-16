import { iniciarAnexoSchema } from '@backend/schemas/ocorrencias'
import { MAXIMO_ANEXOS_POR_OCORRENCIA, TAMANHO_PARTE_ANEXO_BYTES } from '@backend/services/ocorrencias-config'
import { arquivoOcorrenciaValido } from '@backend/services/ocorrencias'
import { obterUsuario } from '../../../../utils/auth'
import { getDatabase } from '../../../../utils/database'

function nomeSeguro(nome: string): string {
  const nomeSemCaminho = nome.split(/[\\/]/).at(-1) ?? ''
  const limpo = nomeSemCaminho.replace(/[\u0000-\u001f\u007f]/g, '').trim()
  return limpo.slice(0, 255)
}

export default defineEventHandler(async (event) => {
  const usuario = await obterUsuario(event)
  const ocorrenciaId = getRouterParam(event, 'id')
  if (!ocorrenciaId || !/^[0-9a-f-]{36}$/i.test(ocorrenciaId)) {
    throw createError({ statusCode: 400, statusMessage: 'O identificador da ocorrência é inválido.' })
  }
  const entrada = iniciarAnexoSchema.safeParse(await readBody(event))
  if (!entrada.success) {
    throw createError({
      statusCode: 400,
      statusMessage: entrada.error.issues[0]?.message ?? 'Os dados do anexo são inválidos.',
    })
  }
  const nomeOriginal = nomeSeguro(entrada.data.nomeOriginal)
  if (!nomeOriginal || !arquivoOcorrenciaValido(
    { ...entrada.data, nomeOriginal },
    TAMANHO_PARTE_ANEXO_BYTES * entrada.data.totalPartes,
  )) {
    throw createError({ statusCode: 400, statusMessage: 'O nome, tipo ou tamanho do arquivo não é permitido.' })
  }

  const db = getDatabase(event)
  const ocorrencia = await db.prepare(
    'SELECT id, relatado_por FROM ocorrencias WHERE id = ?',
  ).bind(ocorrenciaId).first<{ id: string; relatado_por: string }>()
  if (!ocorrencia) throw createError({ statusCode: 404, statusMessage: 'Ocorrência não encontrada.' })
  if (
    usuario.papel !== 'admin'
    && usuario.papel !== 'engenharia'
    && usuario.id !== ocorrencia.relatado_por
  ) {
    throw createError({ statusCode: 403, statusMessage: 'Somente quem relatou, engenharia ou admin pode adicionar anexos.' })
  }
  const quantidade = await db.prepare(
    'SELECT COUNT(*) AS total FROM anexos WHERE ocorrencia_id = ?',
  ).bind(ocorrenciaId).first<{ total: number }>()
  if ((quantidade?.total ?? 0) >= MAXIMO_ANEXOS_POR_OCORRENCIA) {
    throw createError({ statusCode: 409, statusMessage: `Cada ocorrência pode ter no máximo ${MAXIMO_ANEXOS_POR_OCORRENCIA} anexos.` })
  }

  const id = crypto.randomUUID()
  const chaveStorage = crypto.randomUUID()
  await db.prepare(
    `INSERT INTO anexos (
       id, ocorrencia_id, nome_original, chave_storage, tipo_mime, tamanho_bytes,
       enviado_por, total_partes, status_upload
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'enviando')`,
  ).bind(
    id,
    ocorrenciaId,
    nomeOriginal,
    chaveStorage,
    entrada.data.tipoMime,
    entrada.data.tamanhoBytes,
    usuario.id,
    entrada.data.totalPartes,
  ).run()
  setResponseStatus(event, 201)
  return { id, tamanhoParte: TAMANHO_PARTE_ANEXO_BYTES }
})
