import { defineStore } from 'pinia'

export type VisualizacaoCodigos = 'tabela' | 'cards'

export interface FiltrosCodigos {
  busca: string
  marca: string
  status: string
  setor: string
  ordenar: string
  direcao: 'asc' | 'desc'
  pagina: number
  limite: number
}

const filtrosPadrao = (): FiltrosCodigos => ({
  busca: '',
  marca: '',
  status: 'todos',
  setor: '',
  ordenar: 'criado_em',
  direcao: 'desc',
  pagina: 1,
  limite: 20,
})

export const useCodigosStore = defineStore('codigos', () => {
  const filtros = ref<FiltrosCodigos>(filtrosPadrao())
  const visualizacao = ref<VisualizacaoCodigos>('tabela')
  const selecionados = ref<string[]>([])

  function atualizarFiltros(novos: Partial<FiltrosCodigos>, resetarPagina = true) {
    filtros.value = {
      ...filtros.value,
      ...novos,
      ...(resetarPagina && ('busca' in novos || 'marca' in novos || 'status' in novos || 'setor' in novos || 'ordenar' in novos || 'direcao' in novos)
        ? { pagina: 1 }
        : {}),
    }
  }

  function hidratar(query: Record<string, unknown>) {
    const texto = (key: string) => typeof query[key] === 'string' ? query[key] as string : ''
    const numero = (key: string, fallback: number) => {
      const parsed = Number(texto(key))
      return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
    }
    filtros.value = {
      busca: texto('busca').slice(0, 100),
      marca: texto('marca').slice(0, 80),
      status: ['todos', 'sem_teste', 'em_andamento', 'aprovado', 'reprovado'].includes(texto('status')) ? texto('status') : 'todos',
      setor: texto('setor'),
      ordenar: ['criado_em', 'codigo', 'marca', 'modelo', 'ano', 'ultimo_teste'].includes(texto('ordenar')) ? texto('ordenar') : 'criado_em',
      direcao: texto('direcao') === 'asc' ? 'asc' : 'desc',
      pagina: numero('pagina', 1),
      limite: [10, 20, 50].includes(numero('limite', 20)) ? numero('limite', 20) : 20,
    }
  }

  function paraQuery(): Record<string, string> {
    const query: Record<string, string> = {}
    if (filtros.value.busca) query.busca = filtros.value.busca
    if (filtros.value.marca) query.marca = filtros.value.marca
    if (filtros.value.status !== 'todos') query.status = filtros.value.status
    if (filtros.value.setor) query.setor = filtros.value.setor
    if (filtros.value.ordenar !== 'criado_em') query.ordenar = filtros.value.ordenar
    if (filtros.value.direcao !== 'desc') query.direcao = filtros.value.direcao
    if (filtros.value.pagina > 1) query.pagina = String(filtros.value.pagina)
    if (filtros.value.limite !== 20) query.limite = String(filtros.value.limite)
    return query
  }

  function alternarSelecionado(id: string) {
    selecionados.value = selecionados.value.includes(id)
      ? selecionados.value.filter((selecionado: string) => selecionado !== id)
      : [...selecionados.value, id]
  }

  function limparSelecao() {
    selecionados.value = []
  }

  return { filtros, visualizacao, selecionados, atualizarFiltros, hidratar, paraQuery, alternarSelecionado, limparSelecao }
})
