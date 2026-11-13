import { z } from 'zod'
import {
  TAMANHO_MAXIMO_ANEXO_BYTES,
  TAMANHO_PARTE_ANEXO_BYTES,
  TIPOS_ANEXO_PERMITIDOS,
} from '../services/ocorrencias-config'

const id = z.string().uuid('Identificador inválido.')

export const gravidadeOcorrenciaSchema = z.enum(['baixa', 'media', 'alta', 'critica'])
export const statusOcorrenciaSchema = z.enum(['aberta', 'em_analise', 'resolvida', 'descartada'])

export const criarOcorrenciaSchema = z.object({
  codigoId: id,
  testeId: id.optional(),
  testeItemId: id.optional(),
  codigoItemId: id.optional(),
  tipoTeste: z.string().trim().min(1, 'Informe o tipo de teste.').max(120, 'O tipo de teste deve ter no máximo 120 caracteres.'),
  titulo: z.string().trim().min(3, 'O título deve ter pelo menos 3 caracteres.').max(180, 'O título deve ter no máximo 180 caracteres.'),
  descricao: z.string().trim().min(3, 'Descreva a ocorrência.').max(10000, 'A descrição deve ter no máximo 10.000 caracteres.'),
  gravidade: gravidadeOcorrenciaSchema,
  status: statusOcorrenciaSchema.default('aberta'),
}).refine(input => !input.testeItemId || Boolean(input.testeId), {
  message: 'Selecione o teste relacionado ao item.',
  path: ['testeId'],
})

export const atualizarOcorrenciaSchema = z.object({
  tipoTeste: z.string().trim().min(1).max(120).optional(),
  titulo: z.string().trim().min(3).max(180).optional(),
  descricao: z.string().trim().min(3).max(10000).optional(),
  gravidade: gravidadeOcorrenciaSchema.optional(),
  status: statusOcorrenciaSchema.optional(),
  responsavelId: id.nullable().optional(),
  resolucao: z.string().trim().max(10000).nullable().optional(),
}).refine(input => Object.values(input).some(value => value !== undefined), {
  message: 'Informe ao menos um campo para atualizar.',
})

export const comentarioOcorrenciaSchema = z.object({
  texto: z.string().trim().min(1, 'Escreva um comentário.').max(4000, 'O comentário deve ter no máximo 4.000 caracteres.'),
})

export const iniciarAnexoSchema = z.object({
  nomeOriginal: z.string().trim().min(1).max(255),
  tipoMime: z.enum(TIPOS_ANEXO_PERMITIDOS),
  tamanhoBytes: z.number().int().positive().max(TAMANHO_MAXIMO_ANEXO_BYTES),
  totalPartes: z.number().int().positive().max(
    Math.ceil(TAMANHO_MAXIMO_ANEXO_BYTES / TAMANHO_PARTE_ANEXO_BYTES),
  ),
}).refine(input => input.totalPartes === Math.ceil(input.tamanhoBytes / TAMANHO_PARTE_ANEXO_BYTES), {
  message: 'A quantidade de partes do arquivo é inválida.',
  path: ['totalPartes'],
})

export const parteAnexoSchema = z.object({
  numeroParte: z.number().int().nonnegative().max(
    Math.ceil(TAMANHO_MAXIMO_ANEXO_BYTES / TAMANHO_PARTE_ANEXO_BYTES) - 1,
  ),
  conteudoBase64: z.string()
    .min(1)
    .max(Math.ceil(TAMANHO_PARTE_ANEXO_BYTES / 3) * 4),
})

export const listagemOcorrenciasSchema = z.object({
  status: statusOcorrenciaSchema.optional(),
  gravidade: gravidadeOcorrenciaSchema.optional(),
  codigoId: id.optional(),
  testeId: id.optional(),
  responsavelId: id.optional(),
  de: z.string().date('Data inicial inválida.').optional(),
  ate: z.string().date('Data final inválida.').optional(),
  busca: z.string().trim().max(180).optional(),
  ordenar: z.enum(['recentes', 'antigas', 'gravidade', 'titulo']).default('recentes'),
  pagina: z.coerce.number().int().positive().max(10000).default(1),
  limite: z.coerce.number().int().positive().max(100).default(25),
}).refine(input => !input.de || !input.ate || input.de <= input.ate, {
  message: 'A data inicial deve ser anterior ou igual à data final.',
  path: ['de'],
}).refine(input => Math.ceil(input.pagina * input.limite) <= 100000, {
  message: 'A página solicitada excede o limite permitido.',
  path: ['pagina'],
})

export type CriarOcorrenciaInput = z.infer<typeof criarOcorrenciaSchema>
export type AtualizarOcorrenciaInput = z.infer<typeof atualizarOcorrenciaSchema>
export type ListagemOcorrenciasInput = z.infer<typeof listagemOcorrenciasSchema>
export type IniciarAnexoInput = z.infer<typeof iniciarAnexoSchema>
