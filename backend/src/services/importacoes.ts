import { parseDocument } from 'htmlparser2'
import { isTag, isText } from 'domhandler'
import type { AnyNode } from 'domhandler'
import { secoesImportacao, sinonimosSecoes } from '../config/secoes-importacao'
import type { TipoSecaoImportacao } from '../schemas/importacoes'

export interface ItemAnalisado {
  id: string
  nomeCompleto: string
  nomeOriginal: string
  nomePt: string | null
  ordem: number
}

export interface SecaoAnalisada {
  id: string
  tituloOriginal: string
  tipoSecao: TipoSecaoImportacao | null
  status: 'reconhecida' | 'nao_identificada' | 'fora_escopo'
  itens: ItemAnalisado[]
}

export interface ItemParaComparar {
  tipoSecao: TipoSecaoImportacao
  nomeCompleto: string
  nomeOriginal: string
  nomePt: string | null
  ordem: number
}

export interface ItemPersistidoParaComparar {
  id: string
  tipo_secao: TipoSecaoImportacao
  nome_completo: string
  ordem: number
  versao: number
}

export interface ResultadoComparacaoItens {
  novos: Array<{ item: ItemParaComparar; ocorrencia: number }>
  removidos: Array<{ atual: ItemPersistidoParaComparar; ocorrencia: number }>
  inalterados: Array<{ atual: ItemPersistidoParaComparar; item: ItemParaComparar; ocorrencia: number }>
  reordenados: Array<{ id: string; ordem: number }>
}

export function normalizarTitulo(titulo: string): string {
  return titulo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/^\s*\d+(?:\.\d+)*\s*[.)-]?\s*/, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function distanciaLevenshtein(a: string, b: string): number {
  const linhaAnterior = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i++) {
    let diagonal = linhaAnterior[0]!
    linhaAnterior[0] = i
    for (let j = 1; j <= b.length; j++) {
      const acima = linhaAnterior[j]!
      linhaAnterior[j] = Math.min(
        linhaAnterior[j]! + 1,
        linhaAnterior[j - 1]! + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
      diagonal = acima
    }
  }
  return linhaAnterior[b.length]!
}

const sinonimosNormalizados = Object.entries(sinonimosSecoes).flatMap(([tipo, nomes]) =>
  nomes.map(nome => ({ tipo: tipo as TipoSecaoImportacao, nome: normalizarTitulo(nome) })),
)

export function mapearTituloSecao(titulo: string): TipoSecaoImportacao | null {
  const normalizado = normalizarTitulo(titulo)
  if (!normalizado) return null

  const exato = sinonimosNormalizados.find(item => item.nome === normalizado)
  if (exato) return exato.tipo

  const candidatos = sinonimosNormalizados
    .map(item => ({
      ...item,
      distancia: distanciaLevenshtein(normalizado, item.nome),
      limite: Math.max(2, Math.floor(Math.max(normalizado.length, item.nome.length) * 0.18)),
    }))
    .filter(item => item.distancia <= item.limite)
    .sort((a, b) => a.distancia - b.distancia)

  if (!candidatos.length || candidatos[1]?.distancia === candidatos[0]?.distancia) return null
  return candidatos[0]!.tipo
}

function textoDoNo(node: AnyNode): string {
  if (isText(node)) return node.data
  if ('children' in node) return node.children.map(textoDoNo).join('')
  return ''
}

function nivelTitulo(node: AnyNode): 1 | 2 | 3 | null {
  if (!isTag(node)) return null
  const nivelHtml = node.name.match(/^h([1-3])$/i)?.[1]
  if (nivelHtml) return Number(nivelHtml) as 1 | 2 | 3
  if (node.name !== 'p') return null
  const estilo = node.attribs.class ?? ''
  const nivelEstilo = estilo.match(/(?:heading|titulo|t[ií]tulo|title)\s*([1-3])/i)?.[1]
  return nivelEstilo ? Number(nivelEstilo) as 1 | 2 | 3 : null
}

function removerNumeracao(titulo: string): string {
  return titulo.trim().replace(/^\s*\d+(?:\.\d+)*\s*[.)-]?\s*/, '').trim()
}

export function separarNomeItem(nomeCompleto: string): { nomeOriginal: string; nomePt: string | null } {
  const separador = nomeCompleto.indexOf('/DieselDiag:')
  if (separador < 0) return { nomeOriginal: nomeCompleto, nomePt: null }
  return {
    nomeOriginal: nomeCompleto.slice(0, separador).trim(),
    nomePt: nomeCompleto.slice(separador + '/DieselDiag:'.length).trim() || null,
  }
}

export function compararItensPorOcorrencia(
  entrantes: ItemParaComparar[],
  atuais: ItemPersistidoParaComparar[],
): ResultadoComparacaoItens {
  const chave = (tipoSecao: TipoSecaoImportacao, nomeCompleto: string) => `${tipoSecao}\u0000${nomeCompleto}`
  const atuaisOrdenados = [...atuais].sort((a, b) => a.ordem - b.ordem || a.id.localeCompare(b.id))
  const porChave = new Map<string, ItemPersistidoParaComparar[]>()
  for (const atual of atuaisOrdenados) {
    const identidade = chave(atual.tipo_secao, atual.nome_completo)
    const grupo = porChave.get(identidade) ?? []
    grupo.push(atual)
    porChave.set(identidade, grupo)
  }

  const contagemEntrante = new Map<string, number>()
  const mantidos = new Set<string>()
  const resultado: ResultadoComparacaoItens = { novos: [], removidos: [], inalterados: [], reordenados: [] }
  for (const item of entrantes) {
    const identidade = chave(item.tipoSecao, item.nomeCompleto)
    const ocorrencia = (contagemEntrante.get(identidade) ?? 0) + 1
    contagemEntrante.set(identidade, ocorrencia)
    const atual = porChave.get(identidade)?.[ocorrencia - 1]
    if (!atual) {
      resultado.novos.push({ item, ocorrencia })
      continue
    }
    mantidos.add(atual.id)
    resultado.inalterados.push({ atual, item, ocorrencia })
    if (atual.ordem !== item.ordem) resultado.reordenados.push({ id: atual.id, ordem: item.ordem })
  }

  const contagemAtual = new Map<string, number>()
  for (const atual of atuaisOrdenados) {
    const identidade = chave(atual.tipo_secao, atual.nome_completo)
    const ocorrencia = (contagemAtual.get(identidade) ?? 0) + 1
    contagemAtual.set(identidade, ocorrencia)
    if (!mantidos.has(atual.id)) resultado.removidos.push({ atual, ocorrencia })
  }
  return resultado
}

function tituloForaDoEscopo(titulo: string): boolean {
  return /\b(?:falhas?|dtc)\b/i.test(normalizarTitulo(titulo))
}

export function separarSecoes(html: string): SecaoAnalisada[] {
  const parsed = parseDocument(html)
  const elementoHtml = parsed.children.find(node => isTag(node) && node.name === 'html')
  const elementoBody = elementoHtml && isTag(elementoHtml)
    ? elementoHtml.children.find(node => isTag(node) && node.name === 'body')
    : undefined
  const nodes = elementoBody && isTag(elementoBody) ? elementoBody.children : parsed.children
  const secoes: SecaoAnalisada[] = []
  let secaoAtiva: SecaoAnalisada | null = null
  let ordemPorTipo = new Map<TipoSecaoImportacao, number>()

  for (const node of nodes) {
    const nivel = nivelTitulo(node)
    if (nivel === null) continue
    const titulo = removerNumeracao(textoDoNo(node))
    if (!titulo) continue

    if (nivel === 1) {
      if (tituloForaDoEscopo(titulo)) {
        secaoAtiva = {
          id: `secao-${secoes.length + 1}`,
          tituloOriginal: titulo,
          tipoSecao: null,
          status: 'fora_escopo',
          itens: [],
        }
        secoes.push(secaoAtiva)
        continue
      }

      const tipoSecao = mapearTituloSecao(titulo)
      if (!tipoSecao) {
        secaoAtiva = null
        continue
      }

      const existente = secoes.find(secao => secao.tipoSecao === tipoSecao)
      if (existente) {
        secaoAtiva = existente
      } else {
        secaoAtiva = {
          id: `secao-${secoes.length + 1}`,
          tituloOriginal: titulo,
          tipoSecao,
          status: 'reconhecida',
          itens: [],
        }
        secoes.push(secaoAtiva)
        ordemPorTipo.set(tipoSecao, 0)
      }
      continue
    }

    if (nivel !== 2 || !secaoAtiva || secaoAtiva.status !== 'reconhecida' || !secaoAtiva.tipoSecao) continue
    const nomeCompleto = titulo
    const ordem = (ordemPorTipo.get(secaoAtiva.tipoSecao) ?? 0) + 1
    ordemPorTipo.set(secaoAtiva.tipoSecao, ordem)
    secaoAtiva.itens.push({
      id: `${secaoAtiva.tipoSecao}-item-${ordem}`,
      nomeCompleto,
      ...separarNomeItem(nomeCompleto),
      ordem,
    })
  }

  return secoes
}

export function listarTiposSecao() {
  return secoesImportacao
}

export function extrairCodigoDoNomeArquivo(nome: string): string | null {
  const semExtensao = nome.replace(/\.docx$/i, '')
  const resultado = semExtensao.match(/\b[A-Z]{2,10}[-_ ]?\d{2,8}[A-Z]?\b/i)
  return resultado?.[0]?.replaceAll('_', '-').replaceAll(' ', '-').toLocaleUpperCase('pt-BR') ?? null
}
