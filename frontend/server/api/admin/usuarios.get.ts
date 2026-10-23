import { z } from 'zod'
import { exigirAdministrador } from '../../utils/auth'
import { getDatabase } from '../../utils/database'

const usuarioSchema = z.object({
  id: z.string().uuid(),
  nome: z.string(),
  email: z.string().email(),
  setor_id: z.string().uuid(),
  setor: z.string(),
  papel: z.enum(['admin', 'engenharia', 'bancada', 'campo']),
  ativo: z.number().int().min(0).max(1),
})

export default defineEventHandler(async (event) => {
  await exigirAdministrador(event)
  const resultado = await getDatabase(event).prepare(
    `SELECT u.id, u.nome, u.email, u.setor_id, s.nome AS setor, u.papel, u.ativo
     FROM usuarios u JOIN setores s ON s.id = u.setor_id ORDER BY u.nome`,
  ).all()

  const validacao = z.array(usuarioSchema).safeParse(resultado.results)
  if (!validacao.success) {
    throw createError({ statusCode: 500, statusMessage: 'A lista de usuários do banco está inválida.' })
  }

  return { usuarios: validacao.data.map(usuario => ({ ...usuario, ativo: usuario.ativo === 1 })) }
})
