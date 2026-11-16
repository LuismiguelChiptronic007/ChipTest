import { z } from 'zod'

<<<<<<< HEAD
export const categoriasFuncao = ['basico', 'sensores', 'atuadores', 'estados', 'ajustes', 'parametrizacoes'] as const
=======
export const categoriasFuncao = ['basico', 'sensores', 'estados', 'parametrizacoes'] as const
>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3
export const chavesDocumento = ['simulacao', 'interpretacao', 'codigo_falhas', 'rg_dsd_12'] as const

const textoOpcional = (max: number) => z.string().trim().max(max).nullish().transform(value => value || null)
const urlOpcional = z.string().trim().url('Informe uma URL válida.')
  .refine(value => /^https?:\/\//i.test(value), 'A URL deve começar com http:// ou https://.')
  .nullish().transform(value => value || null)
<<<<<<< HEAD
const urlOuImagemInternaOpcional = z.union([
  z.string().trim().url('Informe uma URL válida.')
    .refine(value => /^https?:\/\//i.test(value), 'A URL deve começar com http:// ou https://.'),
  z.string().regex(
    /^\/api\/codigos\/[0-9a-f-]{36}\/visao-geral\/imagens\/[0-9a-f-]{36}$/i,
    'Informe uma URL válida ou cole uma imagem.',
  ),
]).nullish().transform(value => value || null)
=======
>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3

export const atualizarLoadOverviewSchema = z.object({
  requestNumber: z.number().int().positive('O número da solicitação deve ser positivo.'),
  launchedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data válida.')
    .refine((value) => {
      const date = new Date(`${value}T00:00:00Z`)
      return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    }, 'Informe uma data válida.').nullable(),
  responsibleId: z.string().uuid().nullable(),
  demandType: z.enum(['novo_sistema', 'nova_funcao']),
  demandStatus: z.enum(['campo_com_programador', 'campo_sem_programador']),
<<<<<<< HEAD
  sgaPrintUrl: urlOuImagemInternaOpcional,
  systemInfoUrl: urlOuImagemInternaOpcional,
=======
  sgaPrintUrl: urlOpcional,
  systemInfoUrl: urlOpcional,
>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3
  notes: textoOpcional(10000),
})

export const atualizarDocumentoLoadSchema = z.object({
  checked: z.boolean(),
})

export const criarLoadFunctionSchema = z.object({
  category: z.enum(categoriasFuncao),
  title: z.string().trim().min(1).max(180).optional(),
  printUrl: urlOpcional,
})

export const atualizarLoadFunctionSchema = z.object({
  title: z.string().trim().min(1).max(180).optional(),
  printUrl: urlOpcional.optional(),
}).refine(input => Object.values(input).some(value => value !== undefined), {
  message: 'Informe ao menos um campo para atualizar.',
})

export const linhasLoadFunctionSchema = z.object({
  rows: z.array(z.object({
    id: z.string().uuid().optional(),
    item: z.string().trim().max(500).default(''),
    description: z.string().trim().max(4000).default(''),
    value: z.string().trim().max(4000).default(''),
  })).max(200, 'A função aceita no máximo 200 linhas.'),
})

export type AtualizarLoadOverviewInput = z.infer<typeof atualizarLoadOverviewSchema>
export type CriarLoadFunctionInput = z.infer<typeof criarLoadFunctionSchema>
export type AtualizarLoadFunctionInput = z.infer<typeof atualizarLoadFunctionSchema>
export type LinhasLoadFunctionInput = z.infer<typeof linhasLoadFunctionSchema>
