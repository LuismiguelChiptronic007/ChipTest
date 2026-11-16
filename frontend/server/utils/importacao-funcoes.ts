import JSZip from 'jszip'
import { parseDocument } from 'htmlparser2'
import { isTag, isText } from 'domhandler'
import type { AnyNode } from 'domhandler'
import type { LoadFunctionImportCategory, LoadFunctionImportRow } from '@backend/types/load-function-import'

const TAMANHO_MAXIMO_DESCOMPACTADO = 50 * 1024 * 1024
const QUANTIDADE_MAXIMA_ARQUIVOS = 2048
const QUANTIDADE_MAXIMA_LINHAS = 500

type ColunaImportada = 'versionOntime' | 'functionType' | 'functionDieseldiag' | 'equipmentBase' | 'developed'

const cabecalhos: Record<ColunaImportada, string> = {
  versionOntime: 'versao ontime',
  functionType: 'tipo da funcao',
  functionDieseldiag: 'funcao dieseldiag',
  equipmentBase: 'equipamento base',
  developed: 'desenvolvido',
}

const colunasEsperadas = Object.keys(cabecalhos) as ColunaImportada[]

export class ErroImportacaoPlanilha extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function textoDoNo(node: AnyNode): string {
  if (isText(node)) return node.data
  if ('children' in node) return node.children.map(textoDoNo).join('')
  return ''
}

function elementosDescendentes(nodes: AnyNode[], nome: string): AnyNode[] {
  return nodes.flatMap((node) => {
    const encontrados = isTag(node) && node.name === nome ? [node] : []
    if (!('children' in node)) return encontrados
    return [...encontrados, ...elementosDescendentes(node.children, nome)]
  })
}

function textoNormalizado(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[_-]+/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function mapearTipoFuncao(value: string): LoadFunctionImportCategory | null {
  const normalizado = textoNormalizado(value)
  if ([
    'basico',
    'basic',
    'estrutura',
    'relatorio',
    'falha',
    'falhas',
    'informacao central',
    'dados da central',
    'dados central',
  ].includes(normalizado)) return 'basico'
  if (['sensor', 'sensores'].includes(normalizado)) return 'sensores'
  if (['estado', 'estados'].includes(normalizado)) return 'estados'
  if (['atuador', 'atuadores'].includes(normalizado)) return 'atuadores'
  if (['ajuste', 'ajustes'].includes(normalizado)) return 'ajustes'
  if (['parametrizacao', 'parametrizacoes', 'parametro', 'parametros'].includes(normalizado)) return 'parametrizacoes'
  if ([
    'funcao avancada',
    'funcoes avancadas',
    'funcao avancada advanced',
    'funcao advanced',
    'funcoes advanced',
    'advanced',
    'juncao advanced',
    'juncao avancada',
  ].includes(normalizado)) return 'funcao_avancada'
  return null
}

function caminhoPlanilha(target: string): string {
  const targetNormalizado = target.replaceAll('\\', '/').replace(/^\/+/, '')
  if (targetNormalizado.split('/').includes('..')) {
    throw new ErroImportacaoPlanilha('O documento contém uma referência de planilha inválida.')
  }
  const caminho = targetNormalizado.startsWith('xl/') ? targetNormalizado : `xl/${targetNormalizado}`
  if (!caminho.startsWith('xl/worksheets/')) {
    throw new ErroImportacaoPlanilha('A referência da planilha não é válida para importação.')
  }
  return caminho
}

function verificarTamanhoDescompactado(zip: JSZip): void {
  const arquivos = Object.values(zip.files).filter(file => !file.dir)
  if (arquivos.length > QUANTIDADE_MAXIMA_ARQUIVOS) {
    throw new ErroImportacaoPlanilha('O documento contém arquivos demais para ser analisado.')
  }

  let total = 0
  for (const arquivo of arquivos) {
    if (!('_data' in arquivo) || !isRecord(arquivo._data) || typeof arquivo._data.uncompressedSize !== 'number') {
      throw new ErroImportacaoPlanilha('Não foi possível validar o tamanho interno do documento.')
    }
    total += arquivo._data.uncompressedSize
    if (total > TAMANHO_MAXIMO_DESCOMPACTADO) {
      throw new ErroImportacaoPlanilha('O conteúdo descompactado do documento excede o limite permitido.')
    }
  }
}

async function lerXml(zip: JSZip, caminho: string): Promise<AnyNode[]> {
  const arquivo = zip.file(caminho)
  if (!arquivo) throw new ErroImportacaoPlanilha('O documento está incompleto ou não contém uma planilha compatível.')
  const conteudo = await arquivo.async('string')
  return parseDocument(conteudo, { xmlMode: true }).children
}

function lerValorCelula(
  celula: AnyNode,
  stringsCompartilhadas: string[],
): { coluna: string; valor: string } | null {
  if (!isTag(celula)) return null
  const referencia = celula.attribs.r
  const coluna = referencia?.match(/^[A-Z]+/i)?.[0]?.toUpperCase()
  if (!coluna) return null

  const filhos = 'children' in celula ? celula.children : []
  const tipo = celula.attribs.t
  if (tipo === 'inlineStr') {
    return { coluna, valor: elementosDescendentes(filhos, 't').map(textoDoNo).join('') }
  }

  const valor = elementosDescendentes(filhos, 'v').map(textoDoNo).join('')
  if (tipo === 's') {
    const indice = Number(valor)
    if (!Number.isInteger(indice) || indice < 0 || indice >= stringsCompartilhadas.length) {
      throw new ErroImportacaoPlanilha('O documento contém uma referência de texto inválida.')
    }
    return { coluna, valor: stringsCompartilhadas[indice] ?? '' }
  }
  if (tipo === 'b') return { coluna, valor: valor === '1' ? 'TRUE' : valor === '0' ? 'FALSE' : '' }
  return { coluna, valor }
}

function lerLinha(
  linha: AnyNode,
  stringsCompartilhadas: string[],
): { numero: number; valores: Map<string, string> } {
  if (!isTag(linha)) throw new ErroImportacaoPlanilha('O documento contém uma linha inválida.')
  const numero = Number(linha.attribs.r)
  if (!Number.isInteger(numero) || numero < 1) {
    throw new ErroImportacaoPlanilha('O documento contém uma referência de linha inválida.')
  }
  const valores = new Map<string, string>()
  const filhos = 'children' in linha ? linha.children : []
  for (const celula of elementosDescendentes(filhos, 'c')) {
    const valor = lerValorCelula(celula, stringsCompartilhadas)
    if (valor) valores.set(valor.coluna, valor.valor.trim())
  }
  return { numero, valores }
}

function identificarColunas(valores: Map<string, string>): Map<ColunaImportada, string> | null {
  const colunas = new Map<ColunaImportada, string>()
  for (const [coluna, valor] of valores) {
    const cabecalho = textoNormalizado(valor)
    const campo = colunasEsperadas.find(chave => cabecalhos[chave] === cabecalho)
    if (campo) colunas.set(campo, coluna)
  }
  return colunas.size === colunasEsperadas.length ? colunas : null
}

function valorDaColuna(linha: Map<string, string>, colunas: Map<ColunaImportada, string>, campo: ColunaImportada): string {
  return linha.get(colunas.get(campo) ?? '') ?? ''
}

function criarLinhaImportada(
  valores: Map<string, string>,
  colunas: Map<ColunaImportada, string>,
): LoadFunctionImportRow | null {
  const campos = {
    versionOntime: valorDaColuna(valores, colunas, 'versionOntime'),
    functionType: valorDaColuna(valores, colunas, 'functionType'),
    functionDieseldiag: valorDaColuna(valores, colunas, 'functionDieseldiag'),
    equipmentBase: valorDaColuna(valores, colunas, 'equipmentBase'),
    developed: valorDaColuna(valores, colunas, 'developed'),
  }
  if (!Object.values(campos).some(value => value)) return null
  if (!campos.functionType) {
    throw new ErroImportacaoPlanilha('Há uma função sem o campo “Tipo da Função”.')
  }

  const category = mapearTipoFuncao(campos.functionType)
  if (!category) return null

  const linha: LoadFunctionImportRow = {
    category,
    ...campos,
  }
  if (
    linha.versionOntime.length > 120
    || linha.functionType.length > 120
    || linha.functionDieseldiag.length > 1000
    || linha.equipmentBase.length > 500
    || linha.developed.length > 200
  ) {
    throw new ErroImportacaoPlanilha('Uma linha contém campos maiores que o permitido. Confira o documento e tente novamente.')
  }
  return linha
}

export async function analisarPlanilhaFuncoes(bytes: Uint8Array): Promise<LoadFunctionImportRow[]> {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(bytes)
  } catch {
    throw new ErroImportacaoPlanilha('Não foi possível abrir o documento. Envie uma planilha Excel válida.')
  }
  verificarTamanhoDescompactado(zip)

  let workbook: AnyNode[]
  let relacoes: AnyNode[]
  try {
    workbook = await lerXml(zip, 'xl/workbook.xml')
    relacoes = await lerXml(zip, 'xl/_rels/workbook.xml.rels')
  } catch (cause: unknown) {
    if (cause instanceof ErroImportacaoPlanilha) throw cause
    throw new ErroImportacaoPlanilha('Não foi possível ler a estrutura da planilha.')
  }

  const targets = new Map(
    elementosDescendentes(relacoes, 'Relationship')
      .filter(isTag)
      .map(relacao => [relacao.attribs.Id, relacao.attribs.Target]),
  )
  const nomesDePlanilhas = elementosDescendentes(workbook, 'sheet').filter(isTag)
  if (!nomesDePlanilhas.length || nomesDePlanilhas.length > 100) {
    throw new ErroImportacaoPlanilha('O documento não contém uma quantidade válida de planilhas.')
  }

  let stringsCompartilhadas: string[] = []
  if (zip.file('xl/sharedStrings.xml')) {
    const stringsXml = await lerXml(zip, 'xl/sharedStrings.xml')
    stringsCompartilhadas = elementosDescendentes(stringsXml, 'si')
      .map(item => elementosDescendentes('children' in item ? item.children : [], 't').map(textoDoNo).join(''))
  }

  const candidatas: Array<{
    linhas: Array<{ numero: number; valores: Map<string, string> }>
    indiceCabecalho: number
    colunas: Map<ColunaImportada, string>
  }> = []
  for (const planilha of nomesDePlanilhas) {
    const target = planilha.attribs['r:id']
    if (!target || !targets.has(target)) continue
    const caminho = caminhoPlanilha(targets.get(target) ?? '')
    const linhasXml = await lerXml(zip, caminho)
    const linhas = elementosDescendentes(linhasXml, 'row')
      .map(linha => lerLinha(linha, stringsCompartilhadas))
    for (let indice = 0; indice < Math.min(linhas.length, 100); indice += 1) {
      const colunas = identificarColunas(linhas[indice]!.valores)
      if (colunas) candidatas.push({ linhas, indiceCabecalho: indice, colunas })
    }
  }
  if (candidatas.length !== 1) {
    throw new ErroImportacaoPlanilha(
      candidatas.length === 0
        ? 'Não encontrei as colunas Versão_ONTIME, Tipo da Função, Função Dieseldiag, Equipamento Base e Desenvolvido no documento.'
        : 'Encontrei mais de uma tabela com as colunas esperadas. Deixe apenas uma tabela de funções por documento.',
    )
  }

  const [tabela] = candidatas
  if (!tabela) throw new ErroImportacaoPlanilha('A tabela de funções não foi encontrada.')
  const linhas = tabela.linhas.slice(tabela.indiceCabecalho + 1)
  const valoresTiposDesconhecidos = new Set<string>()
  const importadas: LoadFunctionImportRow[] = []
  for (const linha of linhas) {
    const item = criarLinhaImportada(linha.valores, tabela.colunas)
    if (!item) {
      const tipo = valorDaColuna(linha.valores, tabela.colunas, 'functionType')
      const nome = valorDaColuna(linha.valores, tabela.colunas, 'functionDieseldiag')
      if (tipo || nome) valoresTiposDesconhecidos.add(tipo || '(sem tipo)')
      continue
    }
    importadas.push(item)
    if (importadas.length > QUANTIDADE_MAXIMA_LINHAS) {
      throw new ErroImportacaoPlanilha('A planilha ultrapassa o limite de 500 funções.')
    }
  }
  if (valoresTiposDesconhecidos.size) {
    throw new ErroImportacaoPlanilha(
      `Não reconheci os seguintes tipos de função: ${[...valoresTiposDesconhecidos].slice(0, 10).join(', ')}.`,
    )
  }
  if (!importadas.length) {
    throw new ErroImportacaoPlanilha('A tabela não contém funções para importar.')
  }
  return importadas
}
