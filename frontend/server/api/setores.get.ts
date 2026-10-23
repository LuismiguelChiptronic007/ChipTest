import { z } from 'zod'
import { getDatabase } from '../utils/database'

const setorSchema = z.object({
  id: z.string().uuid(),
  nome: z.string(),
})

export default defineEventHandler(async (event) => {
  const resultado = await getDatabase(event)
    .prepare('SELECT id, nome FROM setores ORDER BY nome')
    .all()

  const setores = z.array(setorSchema).safeParse(resultado.results)
  if (!setores.success) {
    throw createError({ statusCode: 500, statusMessage: 'A lista de setores do banco está inválida.' })
  }
  return { setores: setores.data }
})
