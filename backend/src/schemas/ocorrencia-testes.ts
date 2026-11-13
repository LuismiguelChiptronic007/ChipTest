import { z } from 'zod'
import {
  TAMANHO_MAXIMO_ANEXO_BYTES,
  TAMANHO_PARTE_ANEXO_BYTES,
  TIPOS_ANEXO_PERMITIDOS,
} from '../services/ocorrencias-config'

const id = z.string().uuid('Identificador inválido.')

export const tipoTesteOcorrenciaSchema = z.enum(['bancada', 'campo'])
export const statusTesteOcorrenciaSchema = z.enum(['pendente', 'em_andamento', 'aprovado', 'reprovado'])

const camposTesteSchema = z.object({
  kind: tipoTesteOcorrenciaSchema,
  status: statusTesteOcorrenciaSchema,
  testedAt: z.string().datetime({ offset: true, message: 'Informe uma data e hora válidas.' }),
  responsibleIds: z.array(id).min(1, 'Selecione ao menos um responsável.')
    .max(20, 'Selecione no máximo 20 responsáveis.')
    .refine(value => new Set(value).size === value.length, 'Não repita responsáveis.'),
  result: z.string().trim().max(2000, 'O resultado deve ter no máximo 2.000 caracteres.').nullable(),
  notes: z.string().trim().max(10000, 'As observações devem ter no máximo 10.000 caracteres.').nullable(),
  segment: z.string().trim().max(120).nullable(),
  model: z.string().trim().max(120).nullable(),
  version: z.string().trim().max(80).nullable(),
  loadStatus: z.enum(['aprovada', 'reprovada']).nullable(),
  structureStatus: z.enum(['aprovada', 'reprovada']).nullable(),
  needsBench: z.boolean().nullable(),
  needsField: z.boolean().nullable(),
  benchSolves: z.boolean().nullable(),
})

export const criarTesteOcorrenciaSchema = camposTesteSchema

export const atualizarTesteOcorrenciaSchema = camposTesteSchema.partial()
  .refine(input => Object.values(input).some(value => value !== undefined), {
    message: 'Informe ao menos um campo para atualizar.',
  })

export const atualizarStatusTesteOcorrenciaSchema = z.object({
  status: statusTesteOcorrenciaSchema,
})

export const iniciarAnexoTesteOcorrenciaSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  tipoMime: z.enum(TIPOS_ANEXO_PERMITIDOS),
  tamanhoBytes: z.number().int().positive().max(TAMANHO_MAXIMO_ANEXO_BYTES),
  totalPartes: z.number().int().positive().max(
    Math.ceil(TAMANHO_MAXIMO_ANEXO_BYTES / TAMANHO_PARTE_ANEXO_BYTES),
  ),
}).refine(input => input.totalPartes === Math.ceil(input.tamanhoBytes / TAMANHO_PARTE_ANEXO_BYTES), {
  message: 'A quantidade de partes do arquivo é inválida.',
  path: ['totalPartes'],
})

export const parteAnexoTesteOcorrenciaSchema = z.object({
  numeroParte: z.number().int().nonnegative().max(
    Math.ceil(TAMANHO_MAXIMO_ANEXO_BYTES / TAMANHO_PARTE_ANEXO_BYTES) - 1,
  ),
  conteudoBase64: z.string().min(1).max(Math.ceil(TAMANHO_PARTE_ANEXO_BYTES / 3) * 4),
})

export type CriarTesteOcorrenciaInput = z.infer<typeof criarTesteOcorrenciaSchema>
export type AtualizarTesteOcorrenciaInput = z.infer<typeof atualizarTesteOcorrenciaSchema>
export type TipoTesteOcorrencia = z.infer<typeof tipoTesteOcorrenciaSchema>
export type StatusTesteOcorrencia = z.infer<typeof statusTesteOcorrenciaSchema>
export type TipoMimeAnexoTesteOcorrencia = typeof TIPOS_ANEXO_PERMITIDOS[number]
