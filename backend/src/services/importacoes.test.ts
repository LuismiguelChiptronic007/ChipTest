import { describe, expect, it } from 'vitest'
import { compararItensPorOcorrencia, mapearTituloSecao, normalizarTitulo, separarSecoes } from './importacoes'

describe('importação de nomes de itens do Word', () => {
  it('remove numeração automática de seções e itens', () => {
    const resultado = separarSecoes('<h1>1. Comando de leituras da central</h1><h2>1.1) ECU /DieselDiag:Central</h2>')
    expect(resultado[0]?.tituloOriginal).toBe('Comando de leituras da central')
    expect(resultado[0]?.itens[0]).toMatchObject({
      nomeCompleto: 'ECU /DieselDiag:Central',
      nomeOriginal: 'ECU',
      nomePt: 'Central',
    })
  })

  it('permite itens duplicados e preserva a ordem de ocorrência', () => {
    const resultado = separarSecoes('<h1>Sensores</h1><h2>1. RPM /DieselDiag:Rotação</h2><h2>2. RPM /DieselDiag:Rotação</h2>')
    expect(resultado[0]?.itens.map(item => item.nomeCompleto)).toEqual([
      'RPM /DieselDiag:Rotação',
      'RPM /DieselDiag:Rotação',
    ])
    expect(resultado[0]?.itens.map(item => item.ordem)).toEqual([1, 2])
  })

  it('ignora títulos de nível 1 fora das sete seções permitidas', () => {
    expect(separarSecoes('<h1>Conectividade auxiliar</h1><h2>CAN /DieselDiag:Rede CAN</h2>')).toEqual([])
  })

  it('usa o título inteiro como nome original quando não há DieselDiag', () => {
    expect(separarSecoes('<h1>Atuadores</h1><h2>1. Teste da válvula</h2>')[0]?.itens[0])
      .toMatchObject({ nomeCompleto: 'Teste da válvula', nomeOriginal: 'Teste da válvula', nomePt: null })
  })

  it('ignora conteúdo abaixo do título do item', () => {
    const resultado = separarSecoes('<h1>Sensores</h1><h2>RPM /DieselDiag:Rotação</h2><p>Descrição que não é um item</p><h2>Temperatura</h2>')
    expect(resultado[0]?.itens.map(item => item.nomeCompleto)).toEqual(['RPM /DieselDiag:Rotação', 'Temperatura'])
  })

  it('mantém uma seção nível 1 mesmo quando não há Heading 2', () => {
    expect(separarSecoes('<h1>Atuadores</h1><p>Texto que deve ser ignorado</p>')[0])
      .toMatchObject({ tipoSecao: 'atuadores', itens: [] })
  })

  it('preserva seções fora de ordem e separa sensores de estados', () => {
    expect(separarSecoes('<h1>2. Comando de leitura de sensores (estados)</h1><h2>1. Ignição</h2><h1>1. Comando de leituras de sensores (medição)</h1><h2>2. RPM</h2>'))
      .toMatchObject([
        { tipoSecao: 'estados', itens: [{ nomeCompleto: 'Ignição' }] },
        { tipoSecao: 'sensores', itens: [{ nomeCompleto: 'RPM' }] },
      ])
  })

  it('normaliza acentos e mapeia sinônimos configurados', () => {
    expect(normalizarTitulo(' 2.1) Parametrização ')).toBe('parametrizacao')
    expect(mapearTituloSecao('Comando de leituras de sensores (medição)')).toBe('sensores')
    expect(mapearTituloSecao('Função avançada')).toBe('funcao_avancada')
    expect(mapearTituloSecao('Comando de código de falhas')).toBeNull()
  })

  it('marca títulos nível 1 de falhas como fora do escopo', () => {
    expect(separarSecoes('<h1>Comando de código de falhas</h1><h2>P0300</h2>')[0])
      .toMatchObject({ status: 'fora_escopo', tipoSecao: null, itens: [] })
  })

  it('importa somente H2 abaixo de H1 válido e ignora H1 desconhecidos sem gerar itens', () => {
    const resultado = separarSecoes(
      '<h1>Pinos utilizados</h1><h1>Conector do dieseldiag</h1><h1>Comando de leituras da central</h1><h2>VIN /DieselDiag:VIN</h2><h1>Baude rate</h1><h2>Item que não pertence à seção</h2>',
    )
    expect(resultado).toHaveLength(1)
    expect(resultado[0]).toMatchObject({
      tipoSecao: 'dados_central',
      itens: [{ nomeCompleto: 'VIN /DieselDiag:VIN' }],
    })
  })

  it('mapeia os cabeçalhos de seção do documento de exemplo real', () => {
    expect(separarSecoes([
      '<h1>Pinos utilizados:</h1>',
      '<h1>Comando de código de falhas:</h1>',
      '<h2>P0300 /DieselDiag:Misfire</h2>',
      '<h1>Comando de apagar falhas:</h1>',
      '<h1>Comando de leituras da central:</h1>',
      '<h2>Número do VIN (Original) [VIN (Original)]</h2>',
      '<h1>Comando de leituras de sensores (medição):</h1>',
      '<h2>Velocidade da turbina</h2>',
      '<h1>Comando de leitura de sensores (estados):</h1>',
      '<h2>Ignição</h2>',
      '<h1>Comando de testes e ativações:</h1>',
      '<h2>Ativação de válvula</h2>',
      '<h1>Comando de ajustes e parametrizações:</h1>',
      '<h2>Definir limite de velocidade</h2>',
    ].join(''))).toMatchObject([
      { status: 'fora_escopo', tituloOriginal: 'Comando de código de falhas:' },
      { status: 'fora_escopo', tituloOriginal: 'Comando de apagar falhas:' },
      { tipoSecao: 'dados_central', itens: [{ nomeCompleto: 'Número do VIN (Original) [VIN (Original)]' }] },
      { tipoSecao: 'sensores', itens: [{ nomeCompleto: 'Velocidade da turbina' }] },
      { tipoSecao: 'estados', itens: [{ nomeCompleto: 'Ignição' }] },
      { tipoSecao: 'atuadores', itens: [{ nomeCompleto: 'Ativação de válvula' }] },
      { tipoSecao: 'parametrizacao', itens: [{ nomeCompleto: 'Definir limite de velocidade' }] },
    ])
  })

  it('compara por seção, nome completo e ocorrência, mantendo duplicados e desativando excedentes', () => {
    const comparacao = compararItensPorOcorrencia(
      [
        { tipoSecao: 'sensores', nomeCompleto: 'RPM /DieselDiag:Rotação', nomeOriginal: 'RPM', nomePt: 'Rotação', ordem: 1 },
        { tipoSecao: 'sensores', nomeCompleto: 'RPM /DieselDiag:Rotação', nomeOriginal: 'RPM', nomePt: 'Rotação', ordem: 2 },
        { tipoSecao: 'sensores', nomeCompleto: 'Temperatura', nomeOriginal: 'Temperatura', nomePt: null, ordem: 3 },
      ],
      [
        { id: 'item-1', tipo_secao: 'sensores', nome_completo: 'RPM /DieselDiag:Rotação', ordem: 1, versao: 1 },
        { id: 'item-2', tipo_secao: 'sensores', nome_completo: 'RPM /DieselDiag:Rotação', ordem: 2, versao: 1 },
        { id: 'item-3', tipo_secao: 'sensores', nome_completo: 'Obsoleto', ordem: 3, versao: 2 },
      ],
    )
    expect(comparacao.inalterados.map(item => item.ocorrencia)).toEqual([1, 2])
    expect(comparacao.novos.map(item => item.item.nomeCompleto)).toEqual(['Temperatura'])
    expect(comparacao.removidos.map(item => item.atual.nome_completo)).toEqual(['Obsoleto'])
  })

  it('ignora texto normal e níveis de título diferentes de H2', () => {
    expect(separarSecoes('<h1>Sensores</h1><p>TPS 12%</p>')[0]?.itens).toEqual([])
    expect(separarSecoes('<h1>Sensores</h1><h3>TPS 12%</h3>')[0]?.itens).toEqual([])
  })
})
