import { cadastroSchema } from '@backend/schemas/auth'
import { hashPassword } from '@backend/services/crypto'
import { getDatabase } from '../../utils/database'

export default defineEventHandler(async (event) => {
  const resultado = cadastroSchema.safeParse(await readBody(event))
  if (!resultado.success) {
    throw createError({
      statusCode: 400,
      statusMessage: resultado.error.issues[0]?.message ?? 'Confira os dados informados.',
    })
  }

  const db = getDatabase(event)
  const setor = await db.prepare('SELECT id FROM setores WHERE id = ?').bind(resultado.data.setorId).first<{ id: string }>()
  if (!setor) {
    throw createError({ statusCode: 400, statusMessage: 'O setor selecionado não existe.' })
  }

  const id = crypto.randomUUID()
  const senhaHash = await hashPassword(resultado.data.senha)
  try {
    await db.prepare(
      `INSERT INTO usuarios (id, nome, email, setor_id, senha_hash, papel, ativo)
       VALUES (?, ?, ?, ?, ?, 'campo', 0)`,
    ).bind(id, resultado.data.nome, resultado.data.email, setor.id, senhaHash).run()
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed: usuarios.email')) {
      throw createError({ statusCode: 409, statusMessage: 'Este e-mail já está cadastrado.' })
    }
    throw error
  }

  return { sucesso: true, aguardandoLiberacao: true }
})
