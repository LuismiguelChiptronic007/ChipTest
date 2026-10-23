import { z } from 'zod'

export const tipoTesteSchema = z.enum(['bancada', 'campo'])
export const statusTesteSchema = z.enum(['em_andamento', 'aprovado', 'reprovado', 'cancelado'])
export const resultadoTesteItemSchema = z.enum(['nao_testado', 'aprovado', 'reprovado', 'nao_se_aplica'])
export const tipoSecaoTesteSchema = z.enum([
  'dados_central',
  'sensores',
  'estados',
  'falhas',
  'atuadores',
  'ajuste',
  'parametrizacao',
  'funcao_avancada',
])

export const idTesteSchema = z.string().uuid('O teste solicitado é inválido.')

export const criarTesteSchema = z.object({
  tipo: tipoTesteSchema,
  responsavelId: z.string().uuid().optional(),
  veiculoInfo: z.string().trim().max(500, 'As informações do veículo devem ter no máximo 500 caracteres.').nullable().optional(),
  observacoes: z.string().trim().max(5000, 'As observações devem ter no máximo 5.000 caracteres.').nullable().optional(),
})

const atualizarItemTesteBaseSchema = z.object({
  resultado: resultadoTesteItemSchema,
  observacao: z.string().trim().max(2000, 'A observação deve ter no máximo 2.000 caracteres.').nullable().optional(),
})

export const atualizarItemTesteSchema = atualizarItemTesteBaseSchema.superRefine((
  item: z.infer<typeof atualizarItemTesteBaseSchema>,
  contexto: z.RefinementCtx,
) => {
  if (item.resultado === 'reprovado' && !item.observacao?.trim()) {
    contexto.addIssue({
      code: 'custom',
      path: ['observacao'],
      message: 'Informe uma observação para reprovar este item.',
    })
  }
})

const atualizarItensLoteBaseSchema = z.object({
  itens: z.array(z.object({ id: z.string().uuid() })).min(1).max(500),
  resultado: resultadoTesteItemSchema,
})

export const atualizarItensLoteSchema = atualizarItensLoteBaseSchema.superRefine((
  input: z.infer<typeof atualizarItensLoteBaseSchema>,
  contexto: z.RefinementCtx,
) => {
  if (input.resultado === 'reprovado') {
    contexto.addIssue({ code: 'custom', path: ['resultado'], message: 'A reprovação exige observação por item.' })
  }
})

export const finalizarTesteSchema = z.object({
  status: z.enum(['aprovado', 'reprovado', 'cancelado']),
})

const atualizarTesteBaseSchema = z.object({
  veiculoInfo: z.string().trim().max(500, 'As informações do veículo devem ter no máximo 500 caracteres.').nullable().optional(),
  observacoes: z.string().trim().max(5000, 'As observações devem ter no máximo 5.000 caracteres.').nullable().optional(),
})

export const atualizarTesteSchema = atualizarTesteBaseSchema.refine((
  input: z.infer<typeof atualizarTesteBaseSchema>,
) => input.veiculoInfo !== undefined || input.observacoes !== undefined, {
  message: 'Informe ao menos um campo para atualizar.',
})

export type TipoTeste = z.infer<typeof tipoTesteSchema>
export type StatusTeste = z.infer<typeof statusTesteSchema>
export type ResultadoTesteItem = z.infer<typeof resultadoTesteItemSchema>
export type TipoSecaoTeste = z.infer<typeof tipoSecaoTesteSchema>
export type CriarTesteInput = z.infer<typeof criarTesteSchema>
export type AtualizarItemTesteInput = z.infer<typeof atualizarItemTesteSchema>
