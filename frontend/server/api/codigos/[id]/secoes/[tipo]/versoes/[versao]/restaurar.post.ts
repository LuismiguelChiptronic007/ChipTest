import { z } from 'zod'
import { idCodigoSchema } from '@backend/schemas/codigos'
import { tipoSecaoImportacaoSchema } from '@backend/schemas/importacoes'
import { exigirGerenciarCodigos } from '../../../../../../../utils/codigos'
import { getDatabase } from '../../../../../../../utils/database'

export default defineEventHandler(async (event) => {
  const usuario = await exigirGerenciarCodigos(event)
  const codigoId = idCodigoSchema.safeParse(getRouterParam(event, 'id'))
  const tipoSecao = tipoSecaoImportacaoSchema.safeParse(getRouterParam(event, 'tipo'))
  const versao = z.coerce.number().int().positive().safeParse(getRouterParam(event, 'versao'))
  if (!codigoId.success || !tipoSecao.success || !versao.success) {
    throw createError({ statusCode: 400, statusMessage: 'Os dados da versão solicitada são inválidos.' })
  }

  const db = getDatabase(event)
  const atual = await db.prepare(
    `SELECT id, versao, conteudo, atualizado_em FROM codigo_secoes
     WHERE codigo_id = ? AND tipo_secao = ?`,
  ).bind(codigoId.data, tipoSecao.data).first<{ id: string; versao: number; conteudo: string; atualizado_em: string }>()
  const antiga = await db.prepare(
    `SELECT conteudo FROM codigo_secoes_versoes
     WHERE codigo_secao_id = ? AND versao = ?`,
  ).bind(atual?.id ?? '', versao.data).first<{ conteudo: string }>()
  if (!atual || !antiga) {
    throw createError({ statusCode: 404, statusMessage: 'A versão selecionada não está disponível para restauração.' })
  }
  if (atual.versao === versao.data) {
    throw createError({ statusCode: 409, statusMessage: 'Esta versão já está ativa.' })
  }

  const resultado = await db.batch([
    db.prepare(
      `INSERT INTO codigo_secoes_versoes
        (id, codigo_secao_id, versao, conteudo, atualizado_em)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(codigo_secao_id, versao) DO NOTHING`,
    ).bind(crypto.randomUUID(), atual.id, atual.versao, atual.conteudo, atual.atualizado_em),
    db.prepare(
      `UPDATE codigo_secoes
       SET conteudo = ?, versao = versao + 1, atualizado_em = datetime('now')
       WHERE id = ? AND EXISTS (
         SELECT 1 FROM codigo_secoes_versoes
         WHERE codigo_secao_id = ? AND versao = ?
       ) AND versao = ?`,
    ).bind(antiga.conteudo, atual.id, atual.id, versao.data, atual.versao),
    db.prepare(
      `INSERT INTO historico_alteracoes (id, tabela, registro_id, usuario_id, antes, depois)
       SELECT ?, 'codigo_secoes', ?, ?, ?, ? WHERE changes() = 1`,
    ).bind(
      crypto.randomUUID(),
      atual.id,
      usuario.id,
      JSON.stringify({ versao: atual.versao, conteudo: atual.conteudo }),
      JSON.stringify({ versao: atual.versao + 1, conteudo: antiga.conteudo, restaurada_de: versao.data }),
    ),
  ])
  if (resultado[1]?.meta.changes !== 1) {
    throw createError({ statusCode: 409, statusMessage: 'A seção mudou durante a restauração. Atualize as versões e tente novamente.' })
  }

  return { versao: atual.versao + 1 }
})
