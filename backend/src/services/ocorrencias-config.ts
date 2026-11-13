export const TAMANHO_MAXIMO_ANEXO_BYTES = 10 * 1024 * 1024
export const MAXIMO_ANEXOS_POR_OCORRENCIA = 5
export const MAXIMO_ANEXOS_POR_TESTE = 5
export const TAMANHO_PARTE_ANEXO_BYTES = 1024 * 1024

export const TIPOS_ANEXO_PERMITIDOS = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
  'video/mp4',
  'text/plain',
] as const

export type TipoMimeAnexo = typeof TIPOS_ANEXO_PERMITIDOS[number]
