import { z } from 'zod'
import type { CodigoListItem } from '@backend/services/codigos'
import { listagemCodigosSchema } from '@backend/schemas/codigos'
import type { FiltrosCodigos } from '~/stores/codigos'

const listagemSchema = z.object({
  codigos: z.array(z.object({
    id: z.string().uuid(),
    codigo: z.string(),
    marca: z.string(),
    modelo: z.string(),
    motor: z.string().nullable(),
    ano: z.number().nullable(),
    observacoes: z.string().nullable(),
    criado_em: z.string(),
    atualizado_em: z.string().nullable(),
    setor_id: z.string().uuid().nullable(),
    setor: z.string().nullable(),
    ultimo_teste: z.string().nullable(),
    ultimo_teste_data: z.string().nullable(),
    ultimo_teste_tipo: z.enum(['bancada', 'campo']).nullable(),
    status_teste: z.enum(['em_andamento', 'aprovado', 'reprovado']).nullable(),
    ocorrencias_abertas: z.number(),
  })),
  total: z.number().int().nonnegative(),
  pagina: z.number().int().positive(),
  limite: z.number().int().positive(),
  total_paginas: z.number().int().positive(),
  marcas: z.array(z.string()),
  setores: z.array(z.object({ id: z.string().uuid(), nome: z.string() })),
})

export interface EstadoListaCodigos {
  codigos: CodigoListItem[]
  total: number
  pagina: number
  limite: number
  total_paginas: number
  marcas: string[]
  setores: Array<{ id: string; nome: string }>
}

export function useCodigos() {
  const store = useCodigosStore()
  const estado = ref<EstadoListaCodigos>({
    codigos: [],
    total: 0,
    pagina: 1,
    limite: 20,
    total_paginas: 1,
    marcas: [],
    setores: [],
  })
  const carregando = ref(true)
  const erro = ref('')
  let requisicao = 0

  async function carregar() {
    const consulta = listagemCodigosSchema.safeParse(store.filtros)
    if (!consulta.success) {
      erro.value = consulta.error.issues[0]?.message ?? 'Confira os filtros da lista.'
      return
    }
    const atual = ++requisicao
    erro.value = ''
    carregando.value = true
    try {
      const resposta = await $fetch<unknown>('/api/codigos', { query: consulta.data })
      const validacao = listagemSchema.safeParse(resposta)
      if (!validacao.success) throw new Error('A lista recebida do servidor está em um formato inválido.')
      if (atual === requisicao) estado.value = validacao.data
    } catch (error: unknown) {
      if (atual === requisicao) erro.value = mensagemDeErro(error, 'Não foi possível carregar os códigos.')
    } finally {
      if (atual === requisicao) carregando.value = false
    }
  }

  function substituirFiltros(filtros: FiltrosCodigos) {
    store.atualizarFiltros(filtros, false)
    void carregar()
  }

  return {
    estado,
    codigos: computed(() => estado.value.codigos),
    total: computed(() => estado.value.total),
    pagina: computed(() => estado.value.pagina),
    limite: computed(() => estado.value.limite),
    total_paginas: computed(() => estado.value.total_paginas),
    marcas: computed(() => estado.value.marcas),
    setores: computed(() => estado.value.setores),
    carregando,
    erro,
    carregar,
    substituirFiltros,
  }
}
