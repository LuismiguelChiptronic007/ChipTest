export const loadFunctionImportCategories = [
  'basico',
  'sensores',
  'estados',
  'atuadores',
  'ajustes',
  'parametrizacoes',
  'funcao_avancada',
] as const

export type LoadFunctionImportCategory = (typeof loadFunctionImportCategories)[number]

export interface LoadFunctionImportRow {
  category: LoadFunctionImportCategory
  versionOntime: string
  functionType: string
  functionDieseldiag: string
  equipmentBase: string
  developed: string
}
