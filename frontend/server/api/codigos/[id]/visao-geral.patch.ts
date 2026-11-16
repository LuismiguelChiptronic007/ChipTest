<<<<<<< HEAD
import { getHeader, readBody, readMultipartFormData } from 'h3'
import { atualizarLoadOverviewSchema } from '@backend/schemas/load-overview'
import { TAMANHO_MAXIMO_ANEXO_BYTES, TAMANHO_PARTE_ANEXO_BYTES } from '@backend/services/ocorrencias-config'
import { atualizarVisaoGeralCarga } from '@backend/services/load-overview'
import {
  excluirArquivoD1,
  gerarChaveStorage,
  gravarArquivoD1,
  validarConteudoAnexo,
} from '../../../utils/arquivos-d1'
=======
import { atualizarLoadOverviewSchema } from '@backend/schemas/load-overview'
import { atualizarVisaoGeralCarga } from '@backend/services/load-overview'
>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3
import { exigirGerenciarCodigos } from '../../../utils/codigos'
import { getDatabase } from '../../../utils/database'
import { obterCodigoId } from '../../../utils/load-overview'

<<<<<<< HEAD
const extensoesImagem = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
} as const

type CampoImagem = 'sgaPrintImage' | 'systemInfoImage'
type CampoVisaoGeral = 'sga_print_url' | 'system_info_url'

interface ImagemSalva {
  id: string
  chaveStorage: string
  url: string
}

function erroImagem(): never {
  throw createError({ statusCode: 400, statusMessage: 'Envie uma imagem PNG, JPG ou WebP válida, de até 10 MB.' })
}

function extrairIdImagemInterna(url: string | null, codigoId: string): string | null {
  if (!url?.startsWith('/api/codigos/')) return null
  const match = url.match(/^\/api\/codigos\/([0-9a-f-]{36})\/visao-geral\/imagens\/([0-9a-f-]{36})$/i)
  if (!match || match[1]?.toLocaleLowerCase() !== codigoId.toLocaleLowerCase()) {
    throw createError({ statusCode: 400, statusMessage: 'A imagem informada não pertence a esta DSD.' })
  }
  return match[2] ?? null
}

export default defineEventHandler(async (event) => {
  await exigirGerenciarCodigos(event)
  const codigoId = obterCodigoId(event)
  const multipart = (getHeader(event, 'content-type') ?? '').toLocaleLowerCase().includes('multipart/form-data')
  let corpo: unknown
  const arquivos = new Map<CampoImagem, { data: Uint8Array; type: string }>()
  if (multipart) {
    const tamanhoCorpo = Number(getHeader(event, 'content-length') ?? 0)
    if (tamanhoCorpo > TAMANHO_MAXIMO_ANEXO_BYTES * 2 + 1024 * 1024) {
      throw createError({ statusCode: 413, statusMessage: 'As imagens devem ter no máximo 10 MB cada.' })
    }
    const partes = await readMultipartFormData(event) ?? []
    const camposPermitidos = new Set(['input', 'sgaPrintImage', 'systemInfoImage'])
    if (partes.some(parte => !parte.name || !camposPermitidos.has(parte.name))) {
      throw createError({ statusCode: 400, statusMessage: 'O formulário contém campos não reconhecidos.' })
    }
    const entradas = partes.filter(parte => parte.name === 'input')
    if (entradas.length !== 1 || entradas[0]?.filename) {
      throw createError({ statusCode: 400, statusMessage: 'Os dados da visão geral estão incompletos.' })
    }
    try {
      corpo = JSON.parse(new TextDecoder().decode(entradas[0].data))
    } catch {
      throw createError({ statusCode: 400, statusMessage: 'Os dados da visão geral são inválidos.' })
    }
    for (const campo of ['sgaPrintImage', 'systemInfoImage'] as const) {
      const imagens = partes.filter(parte => parte.name === campo)
      if (imagens.length > 1) throw createError({ statusCode: 400, statusMessage: 'Envie somente uma imagem por campo.' })
      const imagem = imagens[0]
      if (imagem) {
        if (!imagem.filename || !imagem.type) erroImagem()
        arquivos.set(campo, { data: imagem.data, type: imagem.type })
      }
    }
  } else {
    corpo = await readBody(event)
  }

  const entrada = atualizarLoadOverviewSchema.safeParse(corpo)
=======
export default defineEventHandler(async (event) => {
  await exigirGerenciarCodigos(event)
  const codigoId = obterCodigoId(event)
  const entrada = atualizarLoadOverviewSchema.safeParse(await readBody(event))
>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3
  if (!entrada.success) {
    throw createError({
      statusCode: 400,
      statusMessage: entrada.error.issues[0]?.message ?? 'Confira os dados da visão geral.',
    })
  }
<<<<<<< HEAD

  const db = getDatabase(event)
  const overview = await db.prepare(
    `SELECT id, sga_print_url, system_info_url
     FROM load_overviews WHERE codigo_id = ?`,
  ).bind(codigoId).first<{
    id: string
    sga_print_url: string | null
    system_info_url: string | null
  }>()
  if (!overview) throw createError({ statusCode: 404, statusMessage: 'Visão geral ou DSD não encontrada.' })

  const imagensNovas: ImagemSalva[] = []
  let input = { ...entrada.data }
  try {
    for (const [campoFormulario, imagem] of arquivos) {
      const extensao = extensoesImagem[imagem.type as keyof typeof extensoesImagem]
      if (
        !extensao
        || imagem.data.byteLength < 1
        || imagem.data.byteLength > TAMANHO_MAXIMO_ANEXO_BYTES
        || !validarConteudoAnexo(`captura.${extensao}`, imagem.type as keyof typeof extensoesImagem, imagem.data)
      ) {
        erroImagem()
      }

      const campo: CampoVisaoGeral = campoFormulario === 'sgaPrintImage' ? 'sga_print_url' : 'system_info_url'
      const id = crypto.randomUUID()
      const chaveStorage = gerarChaveStorage()
      const totalPartes = Math.ceil(imagem.data.byteLength / TAMANHO_PARTE_ANEXO_BYTES)
      try {
        await gravarArquivoD1(db, chaveStorage, imagem.data)
        await db.prepare(
          `INSERT INTO load_overview_images (
             id, overview_id, codigo_id, field, chave_storage, tipo_mime, tamanho_bytes, total_partes
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ).bind(id, overview.id, codigoId, campo, chaveStorage, imagem.type, imagem.data.byteLength, totalPartes).run()
      } catch (cause: unknown) {
        await excluirArquivoD1(db, chaveStorage)
        throw cause
      }
      const url = `/api/codigos/${codigoId}/visao-geral/imagens/${id}`
      imagensNovas.push({ id, chaveStorage, url })
      input = campo === 'sga_print_url'
        ? { ...input, sgaPrintUrl: url }
        : { ...input, systemInfoUrl: url }
    }

    for (const [campo, url] of [
      ['sga_print_url', input.sgaPrintUrl],
      ['system_info_url', input.systemInfoUrl],
    ] as const) {
      const imageId = extrairIdImagemInterna(url, codigoId)
      if (!imageId) continue
      const existe = await db.prepare(
        `SELECT id FROM load_overview_images
         WHERE id = ? AND overview_id = ? AND codigo_id = ? AND field = ?`,
      ).bind(imageId, overview.id, codigoId, campo).first<{ id: string }>()
      if (!existe) {
        throw createError({ statusCode: 400, statusMessage: 'A imagem informada não foi encontrada para este campo.' })
      }
    }

    const atualizado = await atualizarVisaoGeralCarga(db, codigoId, input)
    if (!atualizado) throw createError({ statusCode: 404, statusMessage: 'DSD não encontrada.' })
  } catch (cause: unknown) {
    for (const imagem of imagensNovas) {
      await db.prepare('DELETE FROM load_overview_images WHERE id = ?').bind(imagem.id).run()
      await excluirArquivoD1(db, imagem.chaveStorage)
    }
    throw cause
  }

  for (const [campo, valor] of [
    ['sga_print_url', input.sgaPrintUrl],
    ['system_info_url', input.systemInfoUrl],
  ] as const) {
    const atual = campo === 'sga_print_url' ? overview.sga_print_url : overview.system_info_url
    const atualId = extrairIdImagemInterna(atual, codigoId)
    const novoId = extrairIdImagemInterna(valor, codigoId)
    if (atualId && atualId !== novoId) {
      await db.prepare(
        'DELETE FROM load_overview_images WHERE id = ? AND overview_id = ? AND field = ?',
      ).bind(atualId, overview.id, campo).run()
    }
  }

=======
  const atualizado = await atualizarVisaoGeralCarga(getDatabase(event), codigoId, entrada.data)
  if (!atualizado) throw createError({ statusCode: 404, statusMessage: 'DSD não encontrada.' })
>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3
  return { sucesso: true }
})
