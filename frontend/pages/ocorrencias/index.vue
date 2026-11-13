<script setup lang="ts">
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, MessageSquare, Paperclip, Plus, RefreshCw, Search } from '@lucide/vue'
import LoadOverviewPinnedItem from '../../components/codigos/LoadOverviewPinnedItem.vue'
import { z } from 'zod'

const carregando = ref(true)
const erro = ref('')
const busca = ref('')
const statusFiltro = ref('')
const gravidadeFiltro = ref('')
const codigoFiltro = ref('')
const responsavelFiltro = ref('')
const de = ref('')
const ate = ref('')
const ordenar = ref<'recentes' | 'antigas' | 'gravidade' | 'titulo'>('recentes')
const pagina = ref(1)
const limite = 25
const dados = ref<{
  ocorrencias: Array<{
    id: string
    codigo_id: string
    codigo: string
    marca: string
    modelo: string
    tipo_teste: string | null
    titulo: string
    descricao: string
    gravidade: 'baixa' | 'media' | 'alta' | 'critica'
    status: 'aberta' | 'em_analise' | 'resolvida' | 'descartada'
    relator_nome: string
    responsavel_nome: string | null
    criado_em: string
    total_anexos: number
    total_comentarios: number
  }>
  total: number
  total_paginas: number
  codigos: Array<{ id: string; codigo: string; marca: string; modelo: string }>
  responsaveis: Array<{ id: string; nome: string }>
} | null>(null)

const respostaSchema = z.object({
  ocorrencias: z.array(z.object({
    id: z.string().uuid(),
    codigo_id: z.string().uuid(),
    codigo: z.string(),
    marca: z.string(),
    modelo: z.string(),
    tipo_teste: z.string().nullable(),
    titulo: z.string(),
    descricao: z.string(),
    gravidade: z.enum(['baixa', 'media', 'alta', 'critica']),
    status: z.enum(['aberta', 'em_analise', 'resolvida', 'descartada']),
    relator_nome: z.string(),
    responsavel_nome: z.string().nullable(),
    criado_em: z.string(),
    total_anexos: z.number().int().nonnegative(),
    total_comentarios: z.number().int().nonnegative(),
  })),
  total: z.number().int().nonnegative(),
  total_paginas: z.number().int().positive(),
  codigos: z.array(z.object({ id: z.string().uuid(), codigo: z.string(), marca: z.string(), modelo: z.string() })),
  responsaveis: z.array(z.object({ id: z.string().uuid(), nome: z.string() })),
})

const opcoesStatus = [
  { value: '', label: 'Todos os status' },
  { value: 'aberta', label: 'Erro' },
  { value: 'em_analise', label: 'Analisar' },
  { value: 'resolvida', label: 'Concluída' },
  { value: 'descartada', label: 'Descartada' },
]
const opcoesGravidade = [
  { value: '', label: 'Todas as gravidades' },
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Crítica' },
]
const opcoesCodigos = computed(() => [
  { value: '', label: 'Todos os códigos' },
  ...(dados.value?.codigos ?? []).map((item: { id: string; codigo: string; marca: string; modelo: string }) => ({
    value: item.id,
    label: `${item.codigo} · ${item.marca} ${item.modelo}`,
  })),
])
const opcoesResponsaveis = computed(() => [
  { value: '', label: 'Todos os responsáveis' },
  ...(dados.value?.responsaveis ?? []).map((item: { id: string; nome: string }) => ({
    value: item.id,
    label: item.nome,
  })),
])

function rotuloGravidade(gravidade: string) {
  return ({ baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: 'Crítica' } as Record<string, string>)[gravidade] ?? gravidade
}

function formatarData(data: string) {
  const valor = new Date(data.replace(' ', 'T') + (data.includes('Z') ? '' : 'Z'))
  return Number.isNaN(valor.getTime())
    ? data
    : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(valor)
}

async function carregar() {
  carregando.value = true
  erro.value = ''
  try {
    const resposta = respostaSchema.safeParse(await $fetch<unknown>('/api/ocorrencias', {
      query: {
        busca: busca.value || undefined,
        status: statusFiltro.value || undefined,
        gravidade: gravidadeFiltro.value || undefined,
        codigoId: codigoFiltro.value || undefined,
        responsavelId: responsavelFiltro.value || undefined,
        de: de.value || undefined,
        ate: ate.value || undefined,
        ordenar: ordenar.value,
        pagina: pagina.value,
        limite,
      },
    }))
    if (!resposta.success) throw new Error('A lista de ocorrências retornou dados inválidos.')
    dados.value = resposta.data
  } catch (error: unknown) {
    erro.value = mensagemDeErro(error, 'Não foi possível carregar as ocorrências.')
  } finally {
    carregando.value = false
  }
}

function aplicarFiltros() {
  pagina.value = 1
  void carregar()
}

onMounted(() => void carregar())
</script>

<template>
  <AppShell title="Ocorrências" description="Acompanhe falhas, responsáveis, evidências e ações de resolução.">
    <template #actions>
      <NuxtLink to="/ocorrencias/criar" class="interactive inline-flex min-h-10 items-center gap-2 rounded-control bg-primary px-3.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover sm:text-sm">
        <Plus :size="15" aria-hidden="true" /> Nova ocorrência
      </NuxtLink>
    </template>

    <AppAlert v-if="erro" tone="error" class="mb-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <span>{{ erro }}</span>
        <UiButton variant="secondary" size="sm" @click="carregar"><template #icon><RefreshCw :size="13" aria-hidden="true" /></template>Tentar novamente</UiButton>
      </div>
    </AppAlert>

    <section class="surface-card p-4 sm:p-5">
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label class="relative sm:col-span-2 xl:col-span-1">
          <Search :size="15" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle" aria-hidden="true" />
          <input v-model="busca" type="search" placeholder="Buscar pelo título..." class="interactive min-h-10 w-full rounded-control border border-border bg-surface pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" @keyup.enter="aplicarFiltros">
        </label>
        <UiSelect id="filtro-status-ocorrencia" v-model="statusFiltro" label="Status" :options="opcoesStatus" @update:model-value="aplicarFiltros" />
        <UiSelect id="filtro-gravidade-ocorrencia" v-model="gravidadeFiltro" label="Gravidade" :options="opcoesGravidade" @update:model-value="aplicarFiltros" />
        <UiSelect id="filtro-codigo-ocorrencia" v-model="codigoFiltro" label="Código" :options="opcoesCodigos" @update:model-value="aplicarFiltros" />
        <UiSelect id="filtro-responsavel-ocorrencia" v-model="responsavelFiltro" label="Responsável" :options="opcoesResponsaveis" @update:model-value="aplicarFiltros" />
        <label class="space-y-2 text-xs font-semibold">
          <span>De</span><input v-model="de" type="date" class="interactive min-h-10 w-full rounded-control border border-border bg-surface px-3 text-xs" @change="aplicarFiltros">
        </label>
        <label class="space-y-2 text-xs font-semibold">
          <span>Até</span><input v-model="ate" type="date" class="interactive min-h-10 w-full rounded-control border border-border bg-surface px-3 text-xs" @change="aplicarFiltros">
        </label>
        <UiSelect id="ordenar-ocorrencias" v-model="ordenar" label="Ordenação" :options="[{ value: 'recentes', label: 'Mais recentes' }, { value: 'antigas', label: 'Mais antigas' }, { value: 'gravidade', label: 'Maior gravidade' }, { value: 'titulo', label: 'Título' }]" @update:model-value="aplicarFiltros" />
      </div>
      <div class="mt-3 flex justify-end">
        <UiButton variant="ghost" size="sm" @click="carregar"><template #icon><RefreshCw :size="13" :class="{ 'animate-spin': carregando }" aria-hidden="true" /></template>Atualizar</UiButton>
      </div>
    </section>

    <div v-if="codigoFiltro" class="mt-4">
      <LoadOverviewPinnedItem :codigo-id="codigoFiltro" />
      <h3 class="mt-5 mb-1 text-[10px] font-bold uppercase tracking-[0.13em] text-foreground-subtle">
        Erros · {{ dados?.total ?? 0 }}
      </h3>
    </div>

    <section class="mt-4 surface-card overflow-hidden">
      <div class="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
        <div><h2 class="text-sm font-bold">Lista de ocorrências</h2><p class="mt-1 text-[11px] text-foreground-muted">{{ dados?.total ?? 0 }} registro(s)</p></div>
        <AlertTriangle :size="17" class="text-primary" aria-hidden="true" />
      </div>
      <div v-if="carregando" class="space-y-3 p-4"><UiSkeleton v-for="n in 4" :key="n" variant="block" /></div>
      <UiEmptyState v-else-if="!erro && !dados?.ocorrencias.length" title="Nenhuma ocorrência encontrada" description="Registre um erro observado ou ajuste os filtros." :icon="AlertTriangle">
        <template #action><NuxtLink to="/ocorrencias/criar" class="interactive inline-flex min-h-9 items-center gap-2 rounded-control bg-primary px-3 text-xs font-semibold text-primary-foreground"><Plus :size="14" aria-hidden="true" />Registrar ocorrência</NuxtLink></template>
      </UiEmptyState>
      <ul v-else class="divide-y divide-border">
        <li v-for="item in dados?.ocorrencias" :key="item.id">
          <NuxtLink :to="`/ocorrencias/${item.id}`" class="interactive block p-4 hover:bg-surface-raised/60 sm:px-5">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="break-words text-sm font-bold">{{ item.titulo }}</h3>
                  <UiBadge v-if="item.tipo_teste" tone="neutral">{{ item.tipo_teste }}</UiBadge>
                  <OcorrenciaStatusBadge :status="item.status" />
                  <UiBadge :tone="item.gravidade === 'critica' || item.gravidade === 'alta' ? 'danger' : item.gravidade === 'media' ? 'warning' : 'neutral'">
                    <AlertTriangle :size="12" aria-hidden="true" />{{ rotuloGravidade(item.gravidade) }}
                  </UiBadge>
                </div>
                <p class="mt-2 line-clamp-2 text-xs leading-5 text-foreground-muted">{{ item.descricao }}</p>
                <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-foreground-subtle">
                  <span class="font-mono font-bold text-primary">{{ item.codigo }}</span>
                  <span>{{ item.marca }} {{ item.modelo }}</span>
                  <span>Relatado por {{ item.relator_nome }}</span>
                  <span>Responsável: {{ item.responsavel_nome || 'Não atribuído' }}</span>
                  <span class="inline-flex items-center gap-1"><CalendarDays :size="12" aria-hidden="true" />{{ formatarData(item.criado_em) }}</span>
                  <span class="inline-flex items-center gap-1"><Paperclip :size="12" aria-hidden="true" />{{ item.total_anexos }}</span>
                  <span class="inline-flex items-center gap-1"><MessageSquare :size="12" aria-hidden="true" />{{ item.total_comentarios }}</span>
                </div>
              </div>
              <span class="sr-only">Abrir detalhes</span>
            </div>
          </NuxtLink>
        </li>
      </ul>
      <footer v-if="dados && dados.total_paginas > 1" class="flex items-center justify-between border-t border-border px-4 py-3">
        <span class="text-xs text-foreground-muted">Página {{ pagina }} de {{ dados.total_paginas }}</span>
        <div class="flex gap-2">
          <UiButton variant="secondary" size="sm" :disabled="pagina <= 1" aria-label="Página anterior" @click="pagina--; carregar()"><template #icon><ChevronLeft :size="14" aria-hidden="true" /></template>Anterior</UiButton>
          <UiButton variant="secondary" size="sm" :disabled="pagina >= dados.total_paginas" aria-label="Próxima página" @click="pagina++; carregar()">Próxima<template #icon><ChevronRight :size="14" aria-hidden="true" /></template></UiButton>
        </div>
      </footer>
    </section>
  </AppShell>
</template>
