<script setup lang="ts">
import { Activity, ArrowRight, Ban, CheckCircle2, Clock3, Plus, RefreshCw, XCircle } from '@lucide/vue'
import { z } from 'zod'

type StatusTesteLista = 'em_andamento' | 'aprovado' | 'reprovado' | 'cancelado'
type RegistroTeste = {
  id: string
  codigo_id: string
  codigo: string
  marca: string
  modelo: string
  tipo: 'bancada' | 'campo'
  numero: number
  status: StatusTesteLista
  data_inicio: string
  data_fim: string | null
  responsavel_nome: string
  total_itens: number
  itens_testados: number
  itens_aprovados: number
  itens_reprovados: number
  percentual_aprovado: number
}

const filtro = ref<'todos' | StatusTesteLista>('todos')
const carregando = ref(true)
const erro = ref('')
const testes = ref<RegistroTeste[]>([])

const respostaSchema = z.object({
  testes: z.array(z.object({
    id: z.string().uuid(),
    codigo_id: z.string().uuid(),
    codigo: z.string(),
    marca: z.string(),
    modelo: z.string(),
    tipo: z.enum(['bancada', 'campo']),
    numero: z.number().int().positive(),
    status: z.enum(['em_andamento', 'aprovado', 'reprovado', 'cancelado']),
    data_inicio: z.string(),
    data_fim: z.string().nullable(),
    responsavel_nome: z.string(),
    total_itens: z.number().int().nonnegative(),
    itens_testados: z.number().int().nonnegative(),
    itens_aprovados: z.number().int().nonnegative(),
    itens_reprovados: z.number().int().nonnegative(),
    percentual_aprovado: z.number().int().nonnegative(),
  })),
})

const testesFiltrados = computed(() => filtro.value === 'todos'
  ? testes.value
  : testes.value.filter((teste: RegistroTeste) => teste.status === filtro.value))

function estado(status: StatusTesteLista) {
  if (status === 'em_andamento') return { label: 'Em andamento', tone: 'warning' as const, icon: Clock3 }
  if (status === 'aprovado') return { label: 'Aprovado', tone: 'success' as const, icon: CheckCircle2 }
  if (status === 'reprovado') return { label: 'Reprovado', tone: 'danger' as const, icon: XCircle }
  return { label: 'Cancelado', tone: 'neutral' as const, icon: Ban }
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
    const resposta = respostaSchema.safeParse(await $fetch<unknown>('/api/testes'))
    if (!resposta.success) throw new Error('A lista de testes recebida está em formato inválido.')
    testes.value = resposta.data.testes
  } catch (error: unknown) {
    erro.value = mensagemDeErro(error, 'Não foi possível carregar os testes.')
  } finally {
    carregando.value = false
  }
}

onMounted(() => void carregar())
</script>

<template>
  <AppShell title="Testes" description="Acompanhe checklists em andamento e consulte o histórico de validações.">
    <template #actions>
      <NuxtLink to="/codigos" class="interactive inline-flex min-h-10 items-center gap-2 rounded-control bg-primary px-3.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover sm:text-sm">
        <Plus :size="15" aria-hidden="true" /> Iniciar teste por código
      </NuxtLink>
    </template>

    <AppAlert v-if="erro" tone="error" class="mb-5">
      <div class="flex flex-wrap items-center justify-between gap-3"><span>{{ erro }}</span><UiButton variant="secondary" size="sm" @click="carregar"><template #icon><RefreshCw :size="13" aria-hidden="true" /></template>Tentar novamente</UiButton></div>
    </AppAlert>

    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap gap-2" aria-label="Filtrar testes">
        <button v-for="opcao in [{ id: 'todos', label: 'Todos' }, { id: 'em_andamento', label: 'Em andamento' }, { id: 'aprovado', label: 'Aprovados' }, { id: 'reprovado', label: 'Reprovados' }, { id: 'cancelado', label: 'Cancelados' }]" :key="opcao.id" type="button" class="interactive min-h-9 rounded-full border px-3 text-xs font-semibold" :class="filtro === opcao.id ? 'border-primary bg-info-surface text-info' : 'border-border bg-surface text-foreground-muted hover:bg-surface-raised'" :aria-pressed="filtro === opcao.id" @click="filtro = opcao.id as typeof filtro">{{ opcao.label }}</button>
      </div>
      <UiButton variant="ghost" size="sm" :loading="carregando" @click="carregar"><template #icon><RefreshCw :size="14" aria-hidden="true" /></template>Atualizar</UiButton>
    </div>

    <div v-if="carregando" class="grid gap-3 lg:grid-cols-2">
      <UiCard v-for="index in 4" :key="index"><UiSkeleton variant="heading" /><div class="mt-4"><UiSkeleton variant="block" /></div></UiCard>
    </div>
    <UiEmptyState v-else-if="!testesFiltrados.length" title="Nenhum teste encontrado" description="Os testes iniciados para os códigos aparecerão nesta lista. Você também pode iniciar um novo checklist diretamente no detalhe do código." :icon="Activity">
      <template #action><NuxtLink to="/codigos" class="interactive inline-flex min-h-9 items-center gap-2 rounded-control bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary-hover"><Plus :size="14" aria-hidden="true" />Ver códigos</NuxtLink></template>
    </UiEmptyState>
    <div v-else class="grid gap-3 lg:grid-cols-2">
      <NuxtLink v-for="teste in testesFiltrados" :key="teste.id" :to="`/testes/${teste.id}`" class="surface-card interactive block p-4 hover:border-border-strong sm:p-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="font-mono text-sm font-bold text-primary">{{ teste.codigo }} <span class="text-foreground-subtle">·</span> {{ teste.tipo === 'bancada' ? 'Bancada' : 'Campo' }} nº {{ teste.numero }}</p>
            <h2 class="mt-1 text-sm font-semibold">{{ teste.marca }} {{ teste.modelo }}</h2>
            <p class="mt-1 text-xs text-foreground-muted">{{ teste.responsavel_nome }} · {{ formatarData(teste.data_inicio) }}</p>
          </div>
          <UiBadge :tone="estado(teste.status).tone"><component :is="estado(teste.status).icon" :size="13" aria-hidden="true" />{{ estado(teste.status).label }}</UiBadge>
        </div>
        <div class="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
          <div class="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
            <span>{{ teste.itens_testados }}/{{ teste.total_itens }} testados</span>
            <span class="inline-flex items-center gap-1 text-success"><CheckCircle2 :size="12" aria-hidden="true" />{{ teste.itens_aprovados }} aprovados</span>
            <span class="inline-flex items-center gap-1 text-danger"><XCircle :size="12" aria-hidden="true" />{{ teste.itens_reprovados }} reprovados</span>
          </div>
          <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">{{ teste.percentual_aprovado }}% <ArrowRight :size="13" aria-hidden="true" /></span>
        </div>
      </NuxtLink>
    </div>
  </AppShell>
</template>
