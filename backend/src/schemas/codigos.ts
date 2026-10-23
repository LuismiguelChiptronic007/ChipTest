import { z } from 'zod'

export const statusTesteFiltro = ['todos', 'sem_teste', 'em_andamento', 'aprovado', 'reprovado', 'cancelado'] as const
export const ordenacoesCodigos = ['criado_em', 'codigo', 'marca', 'modelo', 'ano', 'ultimo_teste'] as const

const codigoTexto = z.string().trim().min(1, 'Este campo é obrigatório.').max(80, 'O texto deve ter no máximo 80 caracteres.')

export const codigoSchema = z.object({
  codigo: codigoTexto.transform(value => value.toLocaleUpperCase('pt-BR')),
  marca: codigoTexto,
  modelo: codigoTexto,
  motor: z.string().trim().max(120, 'O motor deve ter no máximo 120 caracteres.').nullish().transform(value => value || null),
  ano: z.preprocess(
    value => value === '' || value === undefined || value === null ? null : Number(value),
    z.number().int('Informe um ano válido.').min(1886, 'O ano deve ser igual ou posterior a 1886.').max(2200, 'Informe um ano válido.').nullable(),
  ),
  observacoes: z.string().trim().max(5000, 'As observações devem ter no máximo 5.000 caracteres.').nullish().transform(value => value || null),
})

export const listagemCodigosSchema = z.object({
  busca: z.string().trim().max(100, 'A busca deve ter no máximo 100 caracteres.').default(''),
  marca: z.string().trim().max(80).default(''),
  status: z.enum(statusTesteFiltro).default('todos'),
  setor: z.string().uuid('O setor selecionado é inválido.').or(z.literal('')).default(''),
  ordenar: z.enum(ordenacoesCodigos).default('criado_em'),
  direcao: z.enum(['asc', 'desc']).default('desc'),
  pagina: z.coerce.number().int().min(1).max(100000).default(1),
  limite: z.coerce.number().int().min(1).max(50).default(20),
})

export const idCodigoSchema = z.string().uuid('O código solicitado é inválido.')

export const exclusaoLoteSchema = z.object({
  ids: z.array(idCodigoSchema).min(1, 'Selecione ao menos um código.').max(50, 'Exclua no máximo 50 códigos por vez.'),
}).refine(data => new Set(data.ids).size === data.ids.length, {
  message: 'A seleção contém códigos repetidos.',
})

export type CodigoInput = z.infer<typeof codigoSchema>
export type ListagemCodigosInput = z.infer<typeof listagemCodigosSchema>
