<script setup lang="ts">
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Ban,
  CheckCircle2,
  CircleDashed,
  Copy,
  CarFront,
  Download,
  Eye,
  FileUp,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Trash2,
  Clock3,
  XCircle,
  X,
} from '@lucide/vue'
import type { CodigoListItem } from '@backend/services/codigos'

const auth = useAuth()
const route = useRoute()
const router = useRouter()
const store = useCodigosStore()
const lista = useCodigos()
const gerencia = computed(() => auth.can('codigos:gerenciar'))
const podeExcluir = computed(() => auth.can('codigos:excluir'))
const modalExclusao = ref(false)
const exclusaoEmAndamento = ref(false)
const erroExclusao = ref('')
const registrosSelecionados = ref(new Map<string, CodigoListItem>())
const busca = ref('')
let temporizadorBusca: ReturnType<typeof setTimeout> | undefined
const erroSelecao = ref('')

const statusOptions = [
  { label: 'Todos os status', value: 'todos' },
  { label: 'Sem testes', value: 'sem_teste' },
  { label: 'Em andamento', value: 'em_andamento' },
  { label: 'Aprovados', value: 'aprovado' },
  { label: 'Reprovados', value: 'reprovado' },
  { label: 'Cancelados', value: 'cancelado' },
]
const marcaOptions = computed(() => [
  { label: 'Todas as marcas', value: '' },
  ...lista.marcas.value.map((marca: string) => ({ label: marca, value: marca })),
])
const setorOptions = computed(() => [
  { label: 'Todos os setores', value: '' },
  ...lista.setores.value.map((setor: { id: string; nome: string }) => ({ label: setor.nome, value: setor.id })),
])
const ordemOptions = [
  { label: 'Mais recentes', value: 'criado_em:desc' },
  { label: 'Mais antigos', value: 'criado_em:asc' },
  { label: 'Código A–Z', value: 'codigo:asc' },
  { label: 'Código Z–A', value: 'codigo:desc' },
  { label: 'Marca A–Z', value: 'marca:asc' },
  { label: 'Ano mais recente', value: 'ano:desc' },
]

const selecionadosPagina = computed(() => lista.codigos.value.filter((codigo: CodigoListItem) => store.selecionados.includes(codigo.id)))
const paginaTodaSelecionada = computed(() => lista.codigos.value.length > 0 && selecionadosPagina.value.length === lista.codigos.value.length)
const statusExclusaoTexto = computed(() => store.selecionados.length === 1
  ? 'Este código será ocultado da lista. O cadastro e o histórico de alterações permanecerão preservados.'
  : `Os ${store.selecionados.length} códigos selecionados serão ocultados da lista. Os cadastros e históricos permanecerão preservados.`)

function statusDoCodigo(codigo: CodigoListItem) {
  if (!codigo.status_teste) return { label: 'Sem testes', tone: 'neutral' as const, icon: CircleDashed }
  if (codigo.status_teste === 'aprovado') return { label: 'Aprovado', tone: 'success' as const, icon: CheckCircle2 }
  if (codigo.status_teste === 'reprovado') return { label: 'Reprovado', tone: 'danger' as const, icon: XCircle }
  if (codigo.status_teste === 'cancelado') return { label: 'Cancelado', tone: 'neutral' as const, icon: Ban }
  return { label: 'Em andamento', tone: 'warning' as const, icon: Clock3 }
}

function nomeTipoTeste(tipo: string | null) {
  if (tipo === 'bancada') return 'Bancada'
  if (tipo === 'campo') return 'Campo'
  return ''
}

function formatarData(data: string | null) {
  if (!data) return 'Ainda sem testes'
  const parsed = new Date(data.length === 10 ? `${data}T12:00:00` : data)
  if (Number.isNaN(parsed.getTime())) return data
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed)
}

function salvarRegistrosSelecionados() {
  for (const codigo of lista.codigos.value) {
    if (store.selecionados.includes(codigo.id)) registrosSelecionados.value.set(codigo.id, codigo)
  }
}

function alternarSelecao(codigo: CodigoListItem) {
  store.alternarSelecionado(codigo.id)
  if (store.selecionados.includes(codigo.id)) registrosSelecionados.value.set(codigo.id, codigo)
  else registrosSelecionados.value.delete(codigo.id)
}

function alternarPaginaToda() {
  if (paginaTodaSelecionada.value) {
    for (const codigo of lista.codigos.value) {
      store.selecionados = store.selecionados.filter((id: string) => id !== codigo.id)
      registrosSelecionados.value.delete(codigo.id)
    }
    return
  }
  for (const codigo of lista.codigos.value) {
    if (!store.selecionados.includes(codigo.id)) store.selecionados.push(codigo.id)
    registrosSelecionados.value.set(codigo.id, codigo)
  }
}

function atualizarBusca(value: string) {
  busca.value = value
  if (temporizadorBusca) clearTimeout(temporizadorBusca)
  temporizadorBusca = setTimeout(() => store.atualizarFiltros({ busca: value }), 300)
}

function selecionarOrdem(value: string) {
  const [ordenar, direcao] = value.split(':')
  if (ordenar && (direcao === 'asc' || direcao === 'desc')) {
    store.atualizarFiltros({ ordenar, direcao })
  }
}

function toggleOrder(field: 'codigo' | 'marca' | 'modelo' | 'ano' | 'ultimo_teste') {
  const direction = store.filtros.ordenar === field && store.filtros.direcao === 'asc' ? 'desc' : 'asc'
  store.atualizarFiltros({ ordenar: field, direcao: direction })
}

function statusDaOrdem(field: string) {
  if (store.filtros.ordenar !== field) return ArrowUpDown
  return store.filtros.direcao === 'asc' ? ArrowUp : ArrowDown
}

async function carregarDaUrl(query: Record<string, unknown>) {
  store.hidratar(query)
  busca.value = store.filtros.busca
  await lista.carregar()
  salvarRegistrosSelecionados()
}

watch(() => route.query, (query: Record<string, unknown>) => {
  void carregarDaUrl(query)
}, { immediate: true })

watch(() => JSON.stringify(store.paraQuery()), (queryString: string) => {
  if (queryString === JSON.stringify(route.query)) return
  void router.replace({ query: store.paraQuery() })
})

async function excluirSelecionados() {
  if (!store.selecionados.length) return
  exclusaoEmAndamento.value = true
  erroExclusao.value = ''
  try {
    if (store.selecionados.length === 1) {
      await $fetch(`/api/codigos/${store.selecionados[0]}`, { method: 'DELETE' })
    } else {
      await $fetch('/api/codigos/lote/excluir', { method: 'DELETE', body: { ids: store.selecionados } })
    }
    for (const id of store.selecionados) registrosSelecionados.value.delete(id)
    store.limparSelecao()
    modalExclusao.value = false
    await lista.carregar()
  } catch (error: unknown) {
    erroExclusao.value = mensagemDeErro(error, 'Não foi possível excluir os códigos selecionados.')
  } finally {
    exclusaoEmAndamento.value = false
  }
}

async function duplicar(codigo: CodigoListItem) {
  try {
    const resposta = await $fetch<{ id: string }>(`/api/codigos/${codigo.id}/duplicar`, { method: 'POST' })
    await navigateTo(`/codigos/${resposta.id}`)
  } catch (error: unknown) {
    lista.erro.value = mensagemDeErro(error, 'Não foi possível duplicar o código.')
  }
}

function csvCell(value: string | number | null) {
  const original = String(value ?? '')
  const seguro = /^[\s]*[=+\-@]/.test(original) ? `'${original}` : original
  const text = seguro.replaceAll('"', '""')
  return `"${text}"`
}

function exportarCsv() {
  const selecionados = [...registrosSelecionados.value.values()]
  if (!selecionados.length) return
  const linhas = [
    ['Código', 'Marca', 'Modelo', 'Motor', 'Ano', 'Status do teste', 'Último teste', 'Setor'],
    ...selecionados.map(codigo => [
      codigo.codigo,
      codigo.marca,
      codigo.modelo,
      codigo.motor,
      codigo.ano,
      statusDoCodigo(codigo).label,
      formatarData(codigo.ultimo_teste_data),
      codigo.setor,
    ]),
  ]
  const csv = `\uFEFF${linhas.map(linha => linha.map(csvCell).join(';')).join('\r\n')}`
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'chiptest-codigos-selecionados.csv'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function selecionarFiltroMarca(value: string) {
  store.atualizarFiltros({ marca: value })
}

function selecionarFiltroSetor(value: string) {
  store.atualizarFiltros({ setor: value })
}

function selecionarFiltroStatus(value: string) {
  store.atualizarFiltros({ status: value })
}

function podeSelecionar(codigo: CodigoListItem) {
  return store.selecionados.includes(codigo.id) || store.selecionados.length < 50
}

function alternarSelecaoSegura(codigo: CodigoListItem) {
  const selecionado = store.selecionados.includes(codigo.id)
  if (!selecionado && store.selecionados.length >= 50) {
    erroSelecao.value = 'A seleção está limitada a 50 códigos por operação.'
    return
  }
  erroSelecao.value = ''
  alternarSelecao(codigo)
}

function alternarPaginaTodaSegura() {
  const novos = lista.codigos.value.filter((codigo: CodigoListItem) => !store.selecionados.includes(codigo.id))
  if (!paginaTodaSelecionada.value && store.selecionados.length + novos.length > 50) {
    erroSelecao.value = 'A seleção está limitada a 50 códigos por operação. Desmarque alguns ou selecione uma parte da página.'
    return
  }
  erroSelecao.value = ''
  alternarPaginaToda()
}

onBeforeUnmount(() => {
  if (temporizadorBusca) clearTimeout(temporizadorBusca)
})
</script>

<template>
  <AppShell title="Códigos de veículos" description="Pesquise e mantenha organizado o catálogo técnico de veículos da Chiptronic.">
    <template #actions>
      <NuxtLink v-if="gerencia" to="/importacoes/nova" class="interactive inline-flex min-h-10 items-center gap-2 rounded-control border border-border bg-surface px-3 text-xs font-semibold hover:bg-surface-raised">
        <FileUp :size="15" aria-hidden="true" /> <span class="hidden sm:inline">Importar Word</span><span class="sm:hidden">Importar</span>
      </NuxtLink>
      <NuxtLink v-if="gerencia" to="/codigos/novo" class="interactive inline-flex min-h-10 items-center gap-2 rounded-control bg-primary px-3.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover sm:px-4 sm:text-sm">
        <Plus :size="16" aria-hidden="true" /> Novo código
      </NuxtLink>
    </template>

    <div class="mb-4 flex flex-wrap items-center gap-2">
      <UiBadge tone="neutral">{{ lista.total.value }} {{ lista.total.value === 1 ? 'veículo' : 'veículos' }}</UiBadge>
      <span v-if="store.filtros.busca || store.filtros.marca || store.filtros.setor || store.filtros.status !== 'todos'" class="text-xs text-foreground-muted">Filtros ativos</span>
      <button
        v-if="store.filtros.busca || store.filtros.marca || store.filtros.setor || store.filtros.status !== 'todos'"
        type="button"
        class="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-primary hover:bg-info-surface"
        @click="store.atualizarFiltros({ busca: '', marca: '', setor: '', status: 'todos' }); busca = ''"
      ><X :size="13" aria-hidden="true" /> Limpar filtros</button>
    </div>

    <section class="surface-card overflow-hidden">
      <div class="space-y-3 border-b border-border p-4 sm:p-5">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div class="w-full lg:max-w-sm"><UiSearch :model-value="busca" label="Buscar códigos" placeholder="Código, marca ou modelo..." @update:model-value="atualizarBusca" /></div>
          <div class="flex flex-wrap items-center gap-2 lg:flex-1">
            <UiSelect id="filtro-marca" label="Marca" :options="marcaOptions" :model-value="store.filtros.marca" @update:model-value="selecionarFiltroMarca" />
            <UiSelect id="filtro-status" label="Status do teste" :options="statusOptions" :model-value="store.filtros.status" @update:model-value="selecionarFiltroStatus" />
            <UiSelect id="filtro-setor" label="Setor" :options="setorOptions" :model-value="store.filtros.setor" @update:model-value="selecionarFiltroSetor" />
          </div>
          <div class="flex items-center gap-2">
            <UiSelect
              id="ordenar-codigos"
              label="Ordenar"
              :options="ordemOptions"
              :model-value="`${store.filtros.ordenar}:${store.filtros.direcao}`"
              @update:model-value="selecionarOrdem"
            />
            <div class="flex shrink-0 items-center gap-0.5 rounded-control border border-border bg-surface-raised p-1" aria-label="Visualização">
              <button type="button" class="grid h-8 w-8 place-items-center rounded text-foreground-muted hover:bg-surface hover:text-foreground" :class="{ 'bg-surface text-foreground shadow-sm': store.visualizacao === 'tabela' }" aria-label="Visualização em tabela" :aria-pressed="store.visualizacao === 'tabela'" @click="store.visualizacao = 'tabela'"><List :size="16" aria-hidden="true" /></button>
              <button type="button" class="grid h-8 w-8 place-items-center rounded text-foreground-muted hover:bg-surface hover:text-foreground" :class="{ 'bg-surface text-foreground shadow-sm': store.visualizacao === 'cards' }" aria-label="Visualização em cards" :aria-pressed="store.visualizacao === 'cards'" @click="store.visualizacao = 'cards'"><LayoutGrid :size="16" aria-hidden="true" /></button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="store.selecionados.length" class="flex flex-wrap items-center justify-between gap-3 border-b border-primary/15 bg-info-surface/60 px-4 py-3 sm:px-5">
        <p class="text-xs font-semibold text-info">{{ store.selecionados.length }} selecionado(s)</p>
        <div class="flex flex-wrap items-center gap-2">
          <UiButton variant="secondary" size="sm" @click="exportarCsv"><template #icon><Download :size="14" aria-hidden="true" /></template>Exportar CSV</UiButton>
          <UiButton v-if="podeExcluir" variant="danger" size="sm" @click="modalExclusao = true"><template #icon><Trash2 :size="14" aria-hidden="true" /></template>Excluir selecionados</UiButton>
          <button type="button" class="grid h-8 w-8 place-items-center rounded-control text-foreground-muted hover:bg-surface hover:text-foreground" aria-label="Limpar seleção" @click="store.limparSelecao(); registrosSelecionados.clear()"><X :size="15" aria-hidden="true" /></button>
        </div>
        <div v-if="erroSelecao" role="status" class="m-4 rounded-card border border-warning/20 bg-warning-surface px-3.5 py-3 text-xs text-warning sm:mx-5">{{ erroSelecao }}</div>
      </div>

      <AppAlert v-if="lista.erro.value" tone="error" class="m-4 sm:m-5">
        <div class="flex flex-wrap items-center justify-between gap-3"><span>{{ lista.erro.value }}</span><UiButton variant="secondary" size="sm" @click="lista.carregar">Tentar novamente</UiButton></div>
      </AppAlert>

      <div v-if="lista.carregando.value" class="space-y-3 p-4 sm:p-5" aria-label="Carregando lista de códigos">
        <UiSkeleton v-for="linha in 5" :key="linha" variant="block" />
      </div>
      <div v-else-if="!lista.erro.value && lista.codigos.value.length === 0" class="p-5 sm:p-8">
        <UiEmptyState
          :title="lista.total.value === 0 && !store.filtros.busca && !store.filtros.marca && !store.filtros.setor && store.filtros.status === 'todos' ? 'Seu catálogo começa aqui' : 'Nenhum código encontrado'"
          :description="lista.total.value === 0 && !store.filtros.busca && !store.filtros.marca && !store.filtros.setor && store.filtros.status === 'todos' ? 'Cadastre o primeiro veículo para organizar informações técnicas e acompanhar os testes.' : 'Tente ajustar a busca ou remover alguns filtros.'"
          :icon="CarFront"
        >
          <template v-if="gerencia && lista.total.value === 0" #action>
            <NuxtLink to="/codigos/novo" class="interactive inline-flex min-h-9 items-center gap-2 rounded-control bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary-hover"><Plus :size="14" aria-hidden="true" /> Cadastrar primeiro código</NuxtLink>
          </template>
        </UiEmptyState>
      </div>

      <template v-else-if="!lista.erro.value && store.visualizacao === 'tabela'">
        <div class="hidden max-h-[620px] overflow-auto md:block">
          <table class="w-full min-w-[940px] border-separate border-spacing-0 text-left text-xs">
            <thead class="sticky top-0 z-10 bg-surface-raised text-[10px] uppercase tracking-[0.12em] text-foreground-subtle">
              <tr>
                <th v-if="podeExcluir" class="w-10 border-b border-border px-4 py-3"><input type="checkbox" :checked="paginaTodaSelecionada" aria-label="Selecionar todos os códigos desta página" class="h-4 w-4 rounded border-border accent-primary" @change="alternarPaginaTodaSegura"></th>
                <th scope="col" class="border-b border-border px-4 py-3 font-bold"><button type="button" class="inline-flex items-center gap-1.5" @click="toggleOrder('codigo')">Código <component :is="statusDaOrdem('codigo')" :size="13" /></button></th>
                <th scope="col" class="border-b border-border px-4 py-3 font-bold"><button type="button" class="inline-flex items-center gap-1.5" @click="toggleOrder('marca')">Veículo <component :is="statusDaOrdem('marca')" :size="13" /></button></th>
                <th scope="col" class="border-b border-border px-4 py-3 font-bold">Motorização</th>
                <th scope="col" class="border-b border-border px-4 py-3 font-bold"><button type="button" class="inline-flex items-center gap-1.5" @click="toggleOrder('ano')">Ano <component :is="statusDaOrdem('ano')" :size="13" /></button></th>
                <th scope="col" class="border-b border-border px-4 py-3 font-bold">Último teste</th>
                <th scope="col" class="border-b border-border px-4 py-3 font-bold">Status</th>
                <th scope="col" class="border-b border-border px-4 py-3 text-right font-bold">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="codigo in lista.codigos.value" :key="codigo.id" class="group hover:bg-surface-raised/70">
                <td v-if="podeExcluir" class="border-b border-border/70 px-4 py-3.5"><input type="checkbox" :checked="store.selecionados.includes(codigo.id)" :disabled="!podeSelecionar(codigo)" :aria-label="`Selecionar ${codigo.codigo}`" class="h-4 w-4 rounded border-border accent-primary disabled:cursor-not-allowed disabled:opacity-40" @change="alternarSelecaoSegura(codigo)"></td>
                <td class="border-b border-border/70 px-4 py-3.5"><NuxtLink :to="`/codigos/${codigo.id}`" class="font-mono text-xs font-semibold text-primary hover:text-primary-hover">{{ codigo.codigo }}</NuxtLink></td>
                <td class="border-b border-border/70 px-4 py-3.5"><NuxtLink :to="`/codigos/${codigo.id}`" class="block max-w-[220px] truncate font-semibold text-foreground hover:text-primary">{{ codigo.marca }} {{ codigo.modelo }}</NuxtLink><p v-if="codigo.setor" class="mt-1 text-[10px] text-foreground-subtle">{{ codigo.setor }}</p></td>
                <td class="border-b border-border/70 px-4 py-3.5 text-foreground-muted">{{ codigo.motor || '—' }}</td>
                <td class="border-b border-border/70 px-4 py-3.5 font-mono text-foreground-muted">{{ codigo.ano || '—' }}</td>
                <td class="border-b border-border/70 px-4 py-3.5"><span class="block font-medium text-foreground-muted">{{ formatarData(codigo.ultimo_teste_data) }}</span><span v-if="codigo.ultimo_teste_tipo" class="mt-0.5 block text-[10px] text-foreground-subtle">{{ nomeTipoTeste(codigo.ultimo_teste_tipo) }}</span></td>
                <td class="border-b border-border/70 px-4 py-3.5"><div class="flex flex-wrap items-center gap-1.5"><UiBadge :tone="statusDoCodigo(codigo).tone"><component :is="statusDoCodigo(codigo).icon" :size="13" aria-hidden="true" />{{ statusDoCodigo(codigo).label }}</UiBadge><UiBadge v-if="codigo.ocorrencias_abertas" tone="danger"><XCircle :size="13" aria-hidden="true" />{{ codigo.ocorrencias_abertas }} falha(s)</UiBadge></div></td>
                <td class="border-b border-border/70 px-4 py-3.5"><div class="flex justify-end gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                  <NuxtLink :to="`/codigos/${codigo.id}`" class="grid h-8 w-8 place-items-center rounded-control text-foreground-subtle hover:bg-surface-muted hover:text-foreground" :aria-label="`Ver ${codigo.codigo}`"><Eye :size="15" aria-hidden="true" /></NuxtLink>
                  <NuxtLink v-if="gerencia" :to="`/codigos/${codigo.id}/editar`" class="grid h-8 w-8 place-items-center rounded-control text-foreground-subtle hover:bg-surface-muted hover:text-foreground" :aria-label="`Editar ${codigo.codigo}`"><Pencil :size="14" aria-hidden="true" /></NuxtLink>
                  <button v-if="gerencia" type="button" class="grid h-8 w-8 place-items-center rounded-control text-foreground-subtle hover:bg-info-surface hover:text-info" :aria-label="`Duplicar ${codigo.codigo}`" @click="duplicar(codigo)"><Copy :size="14" aria-hidden="true" /></button>
                  <button v-if="podeExcluir" type="button" class="grid h-8 w-8 place-items-center rounded-control text-foreground-subtle hover:bg-danger-surface hover:text-danger" :aria-label="`Excluir ${codigo.codigo}`" @click="store.selecionados = [codigo.id]; registrosSelecionados.set(codigo.id, codigo); modalExclusao = true"><Trash2 :size="14" aria-hidden="true" /></button>
                </div></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3 md:hidden">
          <UiCard v-for="codigo in lista.codigos.value" :key="codigo.id" padding="compact" interactive>
            <div class="flex items-start justify-between gap-2">
              <NuxtLink :to="`/codigos/${codigo.id}`" class="font-mono text-xs font-bold text-primary">{{ codigo.codigo }}</NuxtLink>
              <input v-if="podeExcluir" type="checkbox" :checked="store.selecionados.includes(codigo.id)" :disabled="!podeSelecionar(codigo)" :aria-label="`Selecionar ${codigo.codigo}`" class="h-4 w-4 rounded border-border accent-primary disabled:cursor-not-allowed disabled:opacity-40" @change="alternarSelecaoSegura(codigo)">
            </div>
            <NuxtLink :to="`/codigos/${codigo.id}`" class="mt-2 block text-sm font-semibold">{{ codigo.marca }} {{ codigo.modelo }}</NuxtLink>
            <p class="mt-1 text-xs text-foreground-muted">{{ codigo.motor || 'Motorização não informada' }}<span v-if="codigo.ano"> · {{ codigo.ano }}</span></p>
            <div class="mt-3 flex flex-wrap gap-1.5"><UiBadge :tone="statusDoCodigo(codigo).tone"><component :is="statusDoCodigo(codigo).icon" :size="13" aria-hidden="true" />{{ statusDoCodigo(codigo).label }}</UiBadge><UiBadge v-if="codigo.ocorrencias_abertas" tone="danger"><XCircle :size="13" aria-hidden="true" />{{ codigo.ocorrencias_abertas }} falha(s)</UiBadge></div>
            <p class="mt-3 text-[10px] text-foreground-subtle">Último teste: {{ formatarData(codigo.ultimo_teste_data) }}</p>
            <div class="mt-3 flex justify-end gap-1 border-t border-border pt-2">
              <NuxtLink :to="`/codigos/${codigo.id}`" class="grid h-8 w-8 place-items-center rounded-control text-foreground-subtle hover:bg-surface-muted" :aria-label="`Ver ${codigo.codigo}`"><Eye :size="15" aria-hidden="true" /></NuxtLink>
              <NuxtLink v-if="gerencia" :to="`/codigos/${codigo.id}/editar`" class="grid h-8 w-8 place-items-center rounded-control text-foreground-subtle hover:bg-surface-muted" :aria-label="`Editar ${codigo.codigo}`"><Pencil :size="14" aria-hidden="true" /></NuxtLink>
              <button v-if="gerencia" type="button" class="grid h-8 w-8 place-items-center rounded-control text-foreground-subtle hover:bg-info-surface hover:text-info" :aria-label="`Duplicar ${codigo.codigo}`" @click="duplicar(codigo)"><Copy :size="14" aria-hidden="true" /></button>
              <button v-if="podeExcluir" type="button" class="grid h-8 w-8 place-items-center rounded-control text-foreground-subtle hover:bg-danger-surface hover:text-danger" :aria-label="`Excluir ${codigo.codigo}`" @click="store.selecionados = [codigo.id]; registrosSelecionados.set(codigo.id, codigo); modalExclusao = true"><Trash2 :size="14" aria-hidden="true" /></button>
            </div>
          </UiCard>
        </div>
      </template>

      <div v-else-if="!lista.erro.value && lista.codigos.value.length" class="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
        <UiCard v-for="codigo in lista.codigos.value" :key="codigo.id" padding="compact" interactive>
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <NuxtLink :to="`/codigos/${codigo.id}`" class="font-mono text-xs font-bold text-primary hover:text-primary-hover">{{ codigo.codigo }}</NuxtLink>
              <h2 class="mt-2 truncate text-sm font-semibold">{{ codigo.marca }} {{ codigo.modelo }}</h2>
              <p class="mt-1 truncate text-xs text-foreground-muted">{{ codigo.motor || 'Motorização não informada' }}<span v-if="codigo.ano"> · {{ codigo.ano }}</span></p>
            </div>
            <input v-if="podeExcluir" type="checkbox" :checked="store.selecionados.includes(codigo.id)" :disabled="!podeSelecionar(codigo)" :aria-label="`Selecionar ${codigo.codigo}`" class="h-4 w-4 rounded border-border accent-primary disabled:cursor-not-allowed disabled:opacity-40" @change="alternarSelecaoSegura(codigo)">
          </div>
          <div class="mt-4 flex flex-wrap gap-1.5"><UiBadge :tone="statusDoCodigo(codigo).tone"><component :is="statusDoCodigo(codigo).icon" :size="13" aria-hidden="true" />{{ statusDoCodigo(codigo).label }}</UiBadge><UiBadge v-if="codigo.ocorrencias_abertas" tone="danger"><XCircle :size="13" aria-hidden="true" />{{ codigo.ocorrencias_abertas }} falha(s)</UiBadge></div>
          <div class="mt-4 flex items-center justify-between border-t border-border pt-3 text-[10px] text-foreground-subtle">
            <span>{{ nomeTipoTeste(codigo.ultimo_teste_tipo) || 'Último teste' }} · {{ formatarData(codigo.ultimo_teste_data) }}</span>
            <div class="flex gap-1">
              <NuxtLink :to="`/codigos/${codigo.id}`" class="grid h-8 w-8 place-items-center rounded-control hover:bg-surface-muted" :aria-label="`Ver ${codigo.codigo}`"><Eye :size="15" aria-hidden="true" /></NuxtLink>
              <NuxtLink v-if="gerencia" :to="`/codigos/${codigo.id}/editar`" class="grid h-8 w-8 place-items-center rounded-control hover:bg-surface-muted" :aria-label="`Editar ${codigo.codigo}`"><Pencil :size="14" aria-hidden="true" /></NuxtLink>
              <button v-if="gerencia" type="button" class="grid h-8 w-8 place-items-center rounded-control hover:bg-info-surface hover:text-info" :aria-label="`Duplicar ${codigo.codigo}`" @click="duplicar(codigo)"><Copy :size="14" aria-hidden="true" /></button>
            </div>
          </div>
        </UiCard>
      </div>

      <div v-if="!lista.carregando.value && lista.total.value > 0" class="p-4 sm:p-5">
        <UiPagination :page="store.filtros.pagina" :total-pages="lista.total_paginas.value" :total-items="lista.total.value" :page-size="store.filtros.limite" @update:page="store.atualizarFiltros({ pagina: $event }, false)" />
      </div>
    </section>

    <UiOverlay v-model="modalExclusao" title="Confirmar exclusão" description="Esta ação preserva o histórico, mas remove os códigos das consultas normais.">
      <div class="space-y-4">
        <p class="text-sm leading-6 text-foreground-muted">{{ statusExclusaoTexto }}</p>
        <AppAlert v-if="erroExclusao" tone="error">{{ erroExclusao }}</AppAlert>
      </div>
      <template #footer>
        <UiButton variant="secondary" :disabled="exclusaoEmAndamento" @click="modalExclusao = false">Cancelar</UiButton>
        <UiButton variant="danger" :loading="exclusaoEmAndamento" @click="excluirSelecionados">{{ exclusaoEmAndamento ? 'Excluindo...' : 'Excluir códigos' }}</UiButton>
      </template>
    </UiOverlay>
  </AppShell>
</template>
