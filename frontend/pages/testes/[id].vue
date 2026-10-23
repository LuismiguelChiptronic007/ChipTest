<script setup lang="ts">
import {
  AlertTriangle,
  Activity,
  ArrowLeft,
  Ban,
  Check,
  CheckCircle2,
  Circle,
  CircleDashed,
  Clock3,
  ListChecks,
  LoaderCircle,
  Save,
  Search,
  XCircle,
} from '@lucide/vue'
import { z } from 'zod'
import { onBeforeRouteLeave } from 'vue-router'

type ResultadoItem = 'nao_testado' | 'aprovado' | 'reprovado' | 'nao_se_aplica'
type ItemTeste = {
  id: string
  codigo_item_id: string | null
  tipo_secao: string
  nome_snapshot: string
  ordem: number
  resultado: ResultadoItem
  observacao: string | null
  testado_por: string | null
  testado_em: string | null
}
type TesteDetalhe = {
  teste: {
    id: string
    codigo_id: string
    codigo: string
    marca: string
    modelo: string
    tipo: 'bancada' | 'campo'
    numero: number
    responsavel_nome: string
    veiculo_info: string | null
    data_inicio: string
    data_fim: string | null
    status: 'em_andamento' | 'aprovado' | 'reprovado' | 'cancelado'
    observacoes: string | null
  }
  itens: ItemTeste[]
}

const route = useRoute()
const idTeste = computed(() => String(route.params.id))
const carregando = ref(true)
const erro = ref('')
const erroSalvamento = ref('')
const estadoSalvamento = ref<'salvo' | 'salvando' | 'erro'>('salvo')
const dados = ref<TesteDetalhe | null>(null)
const secaoAtiva = ref('')
const filtro = ref<'todos' | 'nao_testados' | 'reprovados'>('todos')
const busca = ref('')
const modalFinalizar = ref(false)
const statusFinal = ref<'aprovado' | 'reprovado' | 'cancelado'>('aprovado')
const finalizando = ref(false)
const erroFinalizar = ref('')
const tentativasOcorrencia = ref(new Set<string>())
const salvamentosPendentes = new Map<string, ReturnType<typeof setTimeout>>()
const salvamentosEmAndamento = new Map<string, Promise<unknown>>()

const respostaSchema = z.object({
  teste: z.object({
    id: z.string().uuid(),
    codigo_id: z.string().uuid(),
    codigo: z.string(),
    marca: z.string(),
    modelo: z.string(),
    tipo: z.enum(['bancada', 'campo']),
    numero: z.number().int().positive(),
    responsavel_nome: z.string(),
    veiculo_info: z.string().nullable(),
    data_inicio: z.string(),
    data_fim: z.string().nullable(),
    status: z.enum(['em_andamento', 'aprovado', 'reprovado', 'cancelado']),
    observacoes: z.string().nullable(),
  }),
  itens: z.array(z.object({
    id: z.string().uuid(),
    codigo_item_id: z.string().uuid().nullable(),
    tipo_secao: z.string(),
    nome_snapshot: z.string(),
    ordem: z.number().int(),
    resultado: z.enum(['nao_testado', 'aprovado', 'reprovado', 'nao_se_aplica']),
    observacao: z.string().nullable(),
    testado_por: z.string().nullable(),
    testado_em: z.string().nullable(),
  })),
})

const grupos = [
  { id: 'dados_central', titulo: 'Dados da central', icon: ListChecks },
  { id: 'sensores', titulo: 'Sensores', icon: Activity },
  { id: 'estados', titulo: 'Estados', icon: Activity },
  { id: 'atuadores', titulo: 'Atuadores', icon: Activity },
  { id: 'ajuste', titulo: 'Ajuste', icon: Activity },
  { id: 'parametrizacao', titulo: 'Parametrização', icon: Activity },
  { id: 'funcao_avancada', titulo: 'Função avançada', icon: Activity },
  { id: 'falhas', titulo: 'Falhas', icon: AlertTriangle },
] as const

const teste = computed(() => dados.value?.teste ?? null)
const somenteLeitura = computed(() => teste.value?.status !== 'em_andamento')
const itensChecklist = computed<ItemTeste[]>(() => dados.value?.itens ?? [])
const itensTestados = computed(() => itensChecklist.value.filter((item: ItemTeste) => item.resultado !== 'nao_testado').length)
const aprovados = computed(() => itensChecklist.value.filter((item: ItemTeste) => item.resultado === 'aprovado').length)
const reprovados = computed(() => itensChecklist.value.filter((item: ItemTeste) => item.resultado === 'reprovado').length)
const total = computed(() => itensChecklist.value.length)
const progresso = computed(() => total.value ? Math.round(itensTestados.value / total.value * 100) : 0)
const sugestaoFinal = computed(() => {
  const itens = itensChecklist.value
  if (itens.some((item: ItemTeste) => item.resultado === 'reprovado')) return 'reprovado' as const
  if (itens.length && itens.every((item: ItemTeste) => item.resultado === 'aprovado' || item.resultado === 'nao_se_aplica')) return 'aprovado' as const
  return 'cancelado' as const
})
const gruposVisiveis = computed(() => grupos.filter(grupo => itensChecklist.value.some((item: ItemTeste) => item.tipo_secao === grupo.id)))
const itensDoGrupo = (id: string): ItemTeste[] => itensChecklist.value.filter((item: ItemTeste) => item.tipo_secao === id)
const itensFiltrados = computed(() => {
  const grupo = itensChecklist.value.filter((item: ItemTeste) => item.tipo_secao === secaoAtiva.value)
  const termo = busca.value.trim().toLocaleLowerCase('pt-BR')
  return grupo.filter((item: ItemTeste) => {
    if (filtro.value === 'nao_testados' && item.resultado !== 'nao_testado') return false
    if (filtro.value === 'reprovados' && item.resultado !== 'reprovado') return false
    return !termo || item.nome_snapshot.toLocaleLowerCase('pt-BR').includes(termo)
  })
})

function nomeSecao(id: string) {
  return grupos.find(grupo => grupo.id === id)?.titulo ?? id
}

function formatarData(data: string) {
  const valor = new Date(data)
  return Number.isNaN(valor.getTime())
    ? data
    : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(valor)
}

async function carregar() {
  carregando.value = true
  erro.value = ''
  try {
    const resposta = respostaSchema.safeParse(await $fetch<unknown>(`/api/testes/${idTeste.value}`))
    if (!resposta.success) throw new Error('Os dados deste teste estão em formato inválido.')
    dados.value = resposta.data
    secaoAtiva.value = gruposVisiveis.value[0]?.id ?? ''
    estadoSalvamento.value = 'salvo'
    erroSalvamento.value = ''
  } catch (error: unknown) {
    erro.value = mensagemDeErro(error, 'Não foi possível carregar este teste.')
  } finally {
    carregando.value = false
  }
}

async function salvarItem(item: ItemTeste) {
  if (!dados.value || somenteLeitura.value) return
  if (item.resultado === 'reprovado' && !item.observacao?.trim()) {
    erroSalvamento.value = `A observação é obrigatória para reprovar “${item.nome_snapshot}”.`
    estadoSalvamento.value = 'erro'
    return
  }
  estadoSalvamento.value = 'salvando'
  erroSalvamento.value = ''
  const requisicao = $fetch(`/api/testes/${idTeste.value}/itens/${item.id}`, {
    method: 'PATCH',
    body: { resultado: item.resultado, observacao: item.observacao },
  })
  salvamentosEmAndamento.set(item.id, requisicao)
  try {
    await requisicao
    estadoSalvamento.value = 'salvo'
  } catch (error: unknown) {
    erroSalvamento.value = mensagemDeErro(error, 'Falha ao salvar o item. Verifique a conexão e tente novamente.')
    estadoSalvamento.value = 'erro'
  } finally {
    if (salvamentosEmAndamento.get(item.id) === requisicao) salvamentosEmAndamento.delete(item.id)
  }
}

function agendarSalvamento(item: ItemTeste) {
  const temporizador = salvamentosPendentes.get(item.id)
  if (temporizador) clearTimeout(temporizador)
  salvamentosPendentes.set(item.id, setTimeout(() => {
    salvamentosPendentes.delete(item.id)
    void salvarItem(item)
  }, 650))
}

function selecionarResultado(item: ItemTeste, resultado: ResultadoItem) {
  item.resultado = resultado
  if (resultado !== 'reprovado' && !item.observacao?.trim()) item.observacao = null
  if (resultado === 'reprovado' && !item.observacao?.trim()) {
    erroSalvamento.value = `Informe a observação obrigatória para reprovar “${item.nome_snapshot}”.`
    estadoSalvamento.value = 'erro'
    return
  }
  void salvarItem(item)
}

async function aprovarGrupo() {
  const itens = itensDoGrupo(secaoAtiva.value)
  if (!itens.length || !dados.value) return
  erroSalvamento.value = ''
  estadoSalvamento.value = 'salvando'
  try {
    await $fetch(`/api/testes/${idTeste.value}/itens/lote`, {
      method: 'PATCH',
      body: { itens: itens.map(item => ({ id: item.id })), resultado: 'aprovado' },
    })
    for (const item of itens) {
      item.resultado = 'aprovado'
      item.observacao = null
    }
    estadoSalvamento.value = 'salvo'
  } catch (error: unknown) {
    erroSalvamento.value = mensagemDeErro(error, 'Não foi possível aprovar o grupo. Tente novamente.')
    estadoSalvamento.value = 'erro'
  }
}

function abrirFinalizacao() {
  statusFinal.value = sugestaoFinal.value
  erroFinalizar.value = ''
  modalFinalizar.value = true
}

async function finalizar() {
  finalizando.value = true
  erroFinalizar.value = ''
  try {
    await $fetch(`/api/testes/${idTeste.value}/finalizar`, {
      method: 'POST',
      body: { status: statusFinal.value },
    })
    modalFinalizar.value = false
    await carregar()
  } catch (error: unknown) {
    erroFinalizar.value = mensagemDeErro(error, 'Não foi possível finalizar o teste.')
  } finally {
    finalizando.value = false
  }
}

function prepararOcorrencia(item: ItemTeste) {
  tentativasOcorrencia.value.add(item.id)
  erroSalvamento.value = `A criação de ocorrência será conectada na Fase 6. O resultado reprovado de “${item.nome_snapshot}” já pode ser salvo.`
  if (item.resultado !== 'reprovado') {
    item.resultado = 'reprovado'
    item.observacao = item.observacao?.trim() || ''
  }
}

async function salvarAlteracoesPendentes(): Promise<boolean> {
  const idsPendentes = [...salvamentosPendentes.keys()]
  for (const temporizador of salvamentosPendentes.values()) clearTimeout(temporizador)
  salvamentosPendentes.clear()
  const itensPendentes = idsPendentes
    .map(id => itensChecklist.value.find((item: ItemTeste) => item.id === id))
    .filter((item): item is ItemTeste => Boolean(item))
    .filter((item: ItemTeste) => !salvamentosEmAndamento.has(item.id))
  await Promise.all([
    ...salvamentosEmAndamento.values(),
    ...itensPendentes.map(item => salvarItem(item)),
  ])
  return estadoSalvamento.value !== 'erro'
}

watch(() => itensChecklist.value.map((item: ItemTeste) => item.resultado).join('|'), () => {
  if (modalFinalizar.value) statusFinal.value = sugestaoFinal.value
})

onBeforeRouteLeave(() => salvarAlteracoesPendentes())
onMounted(() => void carregar())
onBeforeUnmount(() => {
  for (const timer of salvamentosPendentes.values()) clearTimeout(timer)
})
</script>

<template>
  <AppShell :title="teste ? `${teste.tipo === 'bancada' ? 'Bancada' : 'Campo'} · Teste nº ${teste.numero}` : 'Execução de teste'" description="Checklist técnico com salvamento automático de cada item.">
    <template #actions>
      <NuxtLink :to="teste ? `/codigos/${teste.codigo_id}` : '/codigos'" class="interactive inline-flex min-h-9 items-center gap-2 rounded-control border border-border bg-surface px-3 text-xs font-semibold hover:bg-surface-raised">
        <ArrowLeft :size="14" aria-hidden="true" /> Voltar ao código
      </NuxtLink>
    </template>

    <AppAlert v-if="erro" tone="error" class="mb-5">{{ erro }}</AppAlert>
    <UiCard v-if="carregando"><UiSkeleton variant="heading" /><div class="mt-5"><UiSkeleton variant="block" /></div></UiCard>

    <template v-else-if="dados && teste">
      <section class="surface-card sticky top-0 z-20 mb-5 p-4 shadow-card sm:p-5">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <NuxtLink :to="`/codigos/${teste.codigo_id}`" class="font-mono text-lg font-bold text-primary hover:underline">{{ teste.codigo }}</NuxtLink>
              <UiBadge v-if="teste.status === 'em_andamento'" tone="warning"><Clock3 :size="14" aria-hidden="true" /> Em andamento</UiBadge>
              <UiBadge v-else-if="teste.status === 'aprovado'" tone="success"><CheckCircle2 :size="14" aria-hidden="true" /> Aprovado</UiBadge>
              <UiBadge v-else-if="teste.status === 'reprovado'" tone="danger"><XCircle :size="14" aria-hidden="true" /> Reprovado</UiBadge>
              <UiBadge v-else tone="neutral"><Ban :size="14" aria-hidden="true" /> Cancelado</UiBadge>
            </div>
            <p class="mt-1 text-sm font-semibold">{{ teste.marca }} {{ teste.modelo }} <span class="font-normal text-foreground-muted">· {{ teste.responsavel_nome }}</span></p>
            <p class="mt-1 text-xs text-foreground-muted">{{ teste.veiculo_info || 'Identificação do veículo não informada' }} · Iniciado {{ formatarData(teste.data_inicio) }}</p>
          </div>
          <div class="flex items-center gap-2 text-xs">
            <span v-if="estadoSalvamento === 'salvando'" class="inline-flex items-center gap-1.5 text-foreground-muted"><LoaderCircle :size="14" class="animate-spin" aria-hidden="true" /> Salvando</span>
            <span v-else-if="estadoSalvamento === 'salvo'" class="inline-flex items-center gap-1.5 text-success"><CheckCircle2 :size="14" aria-hidden="true" /> Salvo</span>
            <span v-else class="inline-flex items-center gap-1.5 text-danger"><AlertTriangle :size="14" aria-hidden="true" /> Não salvo</span>
            <UiButton v-if="!somenteLeitura" variant="primary" size="sm" @click="abrirFinalizacao">Finalizar teste</UiButton>
          </div>
        </div>
        <div class="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div>
            <div class="flex items-center justify-between text-[11px]">
              <span class="font-semibold">{{ itensTestados }} de {{ total }} testados</span>
              <span class="text-foreground-muted"><span class="text-success">{{ aprovados }} aprovados</span><span class="mx-1.5">·</span><span class="text-danger">{{ reprovados }} reprovados</span></span>
            </div>
            <div class="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted" role="progressbar" :aria-valuenow="progresso" aria-valuemin="0" aria-valuemax="100" :aria-label="`Progresso do teste: ${progresso}%`">
              <div class="h-full rounded-full bg-primary transition-[width] duration-interface" :style="{ width: `${progresso}%` }" />
            </div>
          </div>
          <span class="font-mono text-xs font-semibold text-foreground-muted">{{ progresso }}%</span>
        </div>
      </section>

      <AppAlert v-if="erroSalvamento" tone="error" class="mb-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <span>{{ erroSalvamento }}</span>
          <UiButton v-if="estadoSalvamento === 'erro'" variant="secondary" size="sm" @click="carregar"><template #icon><Save :size="13" aria-hidden="true" /></template>Recarregar</UiButton>
        </div>
      </AppAlert>

      <div class="grid items-start gap-4 xl:grid-cols-[250px_minmax(0,1fr)]">
        <nav class="surface-card p-2 xl:sticky xl:top-[188px]" aria-label="Grupos do checklist">
          <p class="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.13em] text-foreground-subtle">Grupos do teste</p>
          <button
            v-for="grupo in gruposVisiveis"
            :key="grupo.id"
            type="button"
            class="interactive flex min-h-11 w-full items-center justify-between gap-2 rounded-control px-3 text-left text-xs font-medium"
            :class="secaoAtiva === grupo.id ? 'bg-info-surface text-info' : 'text-foreground-muted hover:bg-surface-raised hover:text-foreground'"
            :aria-current="secaoAtiva === grupo.id ? 'page' : undefined"
            @click="secaoAtiva = grupo.id"
          >
            <span class="flex min-w-0 items-center gap-2"><component :is="grupo.icon" :size="15" aria-hidden="true" /><span class="truncate">{{ grupo.titulo }}</span></span>
            <UiBadge tone="neutral">{{ itensDoGrupo(grupo.id).filter(item => item.resultado !== 'nao_testado').length }}/{{ itensDoGrupo(grupo.id).length }}</UiBadge>
          </button>
          <p v-if="!gruposVisiveis.length" class="px-3 py-4 text-xs leading-5 text-foreground-muted">Este código ainda não possui itens importados para checklist.</p>
        </nav>

        <section v-if="secaoAtiva" class="surface-card min-w-0 p-4 sm:p-5">
          <header class="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
            <div>
              <p class="text-[10px] font-bold uppercase tracking-[0.13em] text-foreground-subtle">Checklist por item</p>
              <h2 class="mt-1 text-base font-bold">{{ nomeSecao(secaoAtiva) }}</h2>
              <p class="mt-1 text-xs text-foreground-muted">{{ itensDoGrupo(secaoAtiva).length }} itens no snapshot</p>
            </div>
            <UiButton v-if="!somenteLeitura && itensDoGrupo(secaoAtiva).length" variant="secondary" size="sm" @click="aprovarGrupo">
              <template #icon><Check :size="14" aria-hidden="true" /></template>Marcar grupo como aprovado
            </UiButton>
          </header>

          <div class="flex flex-col gap-2 py-4 sm:flex-row">
            <label class="relative min-w-0 flex-1">
              <Search :size="15" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle" aria-hidden="true" />
              <input v-model="busca" type="search" placeholder="Buscar item..." class="interactive min-h-10 w-full rounded-control border border-border bg-surface pl-9 pr-3 text-sm placeholder:text-foreground-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15">
            </label>
            <select v-model="filtro" class="interactive min-h-10 rounded-control border border-border bg-surface px-3 text-xs font-medium focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" aria-label="Filtrar itens">
              <option value="todos">Todos os itens</option>
              <option value="nao_testados">Não testados</option>
              <option value="reprovados">Reprovados</option>
            </select>
          </div>

          <div v-if="!itensFiltrados.length" class="rounded-card border border-dashed border-border p-8 text-center">
            <CircleDashed :size="24" class="mx-auto text-foreground-subtle" aria-hidden="true" />
            <p class="mt-3 text-sm font-semibold">{{ itensDoGrupo(secaoAtiva).length ? 'Nenhum item corresponde ao filtro' : 'Este grupo está vazio' }}</p>
            <p class="mt-1 text-xs text-foreground-muted">A lista reflete os itens ativos no momento em que o teste foi iniciado.</p>
          </div>

          <ol v-else class="divide-y divide-border">
            <li v-for="item in itensFiltrados" :key="item.id" class="py-4 first:pt-1">
              <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div class="min-w-0 flex-1">
                  <div class="flex items-start gap-2">
                    <CheckCircle2 v-if="item.resultado === 'aprovado'" :size="17" class="mt-0.5 shrink-0 text-success" aria-label="Aprovado" />
                    <XCircle v-else-if="item.resultado === 'reprovado'" :size="17" class="mt-0.5 shrink-0 text-danger" aria-label="Reprovado" />
                    <Ban v-else-if="item.resultado === 'nao_se_aplica'" :size="17" class="mt-0.5 shrink-0 text-neutral" aria-label="Não se aplica" />
                    <Circle v-else :size="17" class="mt-0.5 shrink-0 text-neutral" aria-label="Não testado" />
                    <p class="break-words text-sm font-semibold leading-6">{{ item.nome_snapshot }}</p>
                  </div>
                  <p v-if="item.testado_em" class="ml-6 mt-1 text-[10px] text-foreground-subtle">Atualizado {{ formatarData(item.testado_em) }}</p>
                </div>

                <div class="grid grid-cols-2 gap-2 sm:flex" role="group" :aria-label="`Resultado para ${item.nome_snapshot}`">
                  <button type="button" :disabled="somenteLeitura" class="interactive inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control border px-3 text-xs font-semibold disabled:opacity-50" :class="item.resultado === 'aprovado' ? 'border-success bg-success-surface text-success' : 'border-border bg-surface hover:bg-surface-raised'" :aria-pressed="item.resultado === 'aprovado'" @click="selecionarResultado(item, 'aprovado')"><CheckCircle2 :size="15" aria-hidden="true" /> Aprovado</button>
                  <button type="button" :disabled="somenteLeitura" class="interactive inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control border px-3 text-xs font-semibold disabled:opacity-50" :class="item.resultado === 'reprovado' ? 'border-danger bg-danger-surface text-danger' : 'border-border bg-surface hover:bg-surface-raised'" :aria-pressed="item.resultado === 'reprovado'" @click="selecionarResultado(item, 'reprovado')"><XCircle :size="15" aria-hidden="true" /> Reprovado</button>
                  <button type="button" :disabled="somenteLeitura" class="interactive inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control border px-3 text-xs font-semibold disabled:opacity-50" :class="item.resultado === 'nao_se_aplica' ? 'border-border-strong bg-neutral-surface text-neutral' : 'border-border bg-surface hover:bg-surface-raised'" :aria-pressed="item.resultado === 'nao_se_aplica'" @click="selecionarResultado(item, 'nao_se_aplica')"><Ban :size="15" aria-hidden="true" /> N/A</button>
                </div>
              </div>

              <div class="ml-6 mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <textarea
                  v-model="item.observacao"
                  :disabled="somenteLeitura"
                  rows="2"
                  maxlength="2000"
                  :aria-label="`Observação para ${item.nome_snapshot}`"
                  :placeholder="item.resultado === 'reprovado' ? 'Descreva o motivo da reprovação (obrigatório)' : 'Observação opcional...'"
                  class="interactive w-full rounded-control border border-border bg-surface px-3 py-2 text-xs placeholder:text-foreground-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
                  @input="agendarSalvamento(item)"
                  @blur="salvarItem(item)"
                />
                <UiButton v-if="item.resultado === 'reprovado' && !somenteLeitura" variant="ghost" size="sm" class="self-start text-danger" @click="prepararOcorrencia(item)">
                  <template #icon><AlertTriangle :size="14" aria-hidden="true" /></template>Abrir ocorrência
                </UiButton>
              </div>
            </li>
          </ol>
        </section>
      </div>

      <UiOverlay v-model="modalFinalizar" title="Finalizar teste" description="Revise o resumo e confirme o status final da execução.">
        <div class="space-y-4">
          <div class="grid grid-cols-3 gap-2">
            <div class="rounded-control bg-surface-raised p-3 text-center"><p class="text-lg font-bold">{{ itensTestados }}/{{ total }}</p><p class="text-[10px] text-foreground-muted">testados</p></div>
            <div class="rounded-control bg-success-surface p-3 text-center"><p class="text-lg font-bold text-success">{{ aprovados }}</p><p class="text-[10px] text-success">aprovados</p></div>
            <div class="rounded-control bg-danger-surface p-3 text-center"><p class="text-lg font-bold text-danger">{{ reprovados }}</p><p class="text-[10px] text-danger">reprovados</p></div>
          </div>
          <AppAlert v-if="itensTestados < total" tone="info">
            Há {{ total - itensTestados }} item(ns) não testado(s). Você pode finalizar mesmo assim.
          </AppAlert>
          <label class="block space-y-2 text-sm font-semibold">
            Status geral sugerido
            <select v-model="statusFinal" class="interactive min-h-11 w-full rounded-control border border-border bg-surface px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15">
              <option value="aprovado">Aprovado</option>
              <option value="reprovado">Reprovado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </label>
          <AppAlert v-if="erroFinalizar" tone="error">{{ erroFinalizar }}</AppAlert>
        </div>
        <template #footer>
          <UiButton variant="secondary" @click="modalFinalizar = false">Continuar teste</UiButton>
          <UiButton variant="primary" :loading="finalizando" @click="finalizar">Confirmar finalização</UiButton>
        </template>
      </UiOverlay>
    </template>
  </AppShell>
</template>
