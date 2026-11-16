import { z } from 'zod'

export const tiposSecaoBanco = [
  'dados_central',
  'sensores',
  'estados',
  'falhas',
  'atuadores',
  'ajuste',
  'parametrizacao',
  'funcao_avancada',
] as const

export const tipoSecaoBancoSchema = z.enum(tiposSecaoBanco)
export type TipoSecaoBanco = z.infer<typeof tipoSecaoBancoSchema>

export const tiposSecaoImportacao = [
  'dados_central',
  'sensores',
  'estados',
  'atuadores',
  'ajuste',
  'parametrizacao',
  'funcao_avancada',
] as const

export const tipoSecaoImportacaoSchema = z.enum(tiposSecaoImportacao)
export type TipoSecaoImportacao = z.infer<typeof tipoSecaoImportacaoSchema>

export const criarImportacaoSchema = z.object({
  hashArquivo: z.string().regex(/^[a-f0-9]{64}$/, 'O documento selecionado mudou. Analise o arquivo novamente.'),
  codigoId: z.string().uuid().optional(),
  novoCodigo: z.object({
    codigo: z.string().trim().min(1).max(80),
    marca: z.string().trim().min(1).max(80),
    modelo: z.string().trim().min(1).max(80),
    motor: z.string().trim().max(120).nullish(),
    ano: z.number().int().min(1886).max(2200).nullable().optional(),
    observacoes: z.string().trim().max(5000).nullish(),
  }).optional(),
  secoes: z.array(z.object({
    tituloOriginal: z.string().trim().min(1).max(200),
    tipoSecao: tipoSecaoImportacaoSchema.nullable(),
    acao: z.enum(['importar', 'ignorar']),
    itens: z.array(z.object({
      nomeCompleto: z.string().trim().min(1).max(500),
      ordem: z.number().int().positive(),
    })).max(2000),
  })).max(100),
}).refine(data => Boolean(data.codigoId) !== Boolean(data.novoCodigo), {
  message: 'Selecione um código existente ou informe os dados de um novo código.',
  path: ['codigoId'],
})

const itemResumoSchema = z.object({
  tipo_secao: tipoSecaoImportacaoSchema,
  nome_completo: z.string(),
  ocorrencia: z.number().int().positive(),
})

export const resumoImportacaoSchema = z.object({
  novos: z.array(itemResumoSchema),
  removidos: z.array(itemResumoSchema),
  inalterados: z.array(itemResumoSchema),
  ignoradas: z.array(z.object({ titulo: z.string(), tipo_secao: tipoSecaoImportacaoSchema.nullable() })),
  legado: z.boolean().optional(),
})

export const idImportacaoSchema = z.string().uuid('A importação solicitada é inválida.')

export const nomeTipoSecaoImportacao: Record<TipoSecaoImportacao, string> = {
  dados_central: 'Dados da central',
  sensores: 'Sensores',
  estados: 'Estados',
  atuadores: 'Atuadores',
  ajuste: 'Ajuste',
  parametrizacao: 'Parametrização',
  funcao_avancada: 'Função avançada',
}

export const nomeTipoSecaoBanco: Record<TipoSecaoBanco, string> = {
  ...nomeTipoSecaoImportacao,
  falhas: 'Falhas',
}
