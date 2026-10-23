import type { TipoSecaoImportacao } from '../schemas/importacoes'

export const secoesImportacao = [
  { tipo: 'dados_central', titulo: 'Dados da central' },
  { tipo: 'sensores', titulo: 'Sensores' },
  { tipo: 'estados', titulo: 'Estados' },
  { tipo: 'atuadores', titulo: 'Atuadores' },
  { tipo: 'ajuste', titulo: 'Ajuste' },
  { tipo: 'parametrizacao', titulo: 'Parametrização' },
  { tipo: 'funcao_avancada', titulo: 'Função avançada' },
] as const satisfies ReadonlyArray<{ tipo: TipoSecaoImportacao; titulo: string }>

export const sinonimosSecoes: Record<TipoSecaoImportacao, readonly string[]> = {
  dados_central: [
    'dados da informacao da central',
    'dados informacao da central',
    'informacao da central',
    'informacao central',
    'comando de leituras da central',
    'comando de leitura da central',
    'dados da central',
    'identificacao da central',
    'central',
  ],
  sensores: [
    'sensores',
    'comando de leituras de sensores medicao',
    'comando de leitura de sensores medicao',
    'leituras de sensores',
    'medicao de sensores',
  ],
  estados: [
    'estados',
    'estados da central',
    'estados de sensores',
    'estado dos sensores',
    'comando de leitura de sensores estados',
    'comando de leitura de estados',
    'comando de leituras de estados',
  ],
  atuadores: [
    'atuadores',
    'comando de testes e ativacoes',
    'comando de testes de atuadores',
    'comando de acionamento de atuadores',
    'acionamentos',
    'testes de atuadores',
  ],
  ajuste: ['ajuste', 'ajustes', 'comando de ajuste', 'regulagens'],
  parametrizacao: [
    'parametrizacao',
    'parametros',
    'comando de ajustes e parametrizacoes',
    'comando de parametrizacao',
    'parametros configuraveis',
    'configuracao',
  ],
  funcao_avancada: [
    'funcao avancada',
    'funcao advanced',
    'funcao avancada advanced',
    'funcoes avancadas',
    'funcoes advanced',
    'function advanced',
    'comando de funcoes avancadas',
    'funcionalidade avancada',
    'funcoes especiais',
  ],
}
