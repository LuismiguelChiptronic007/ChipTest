<script setup lang="ts">
import { Activity, AlertTriangle, ArrowRight, CheckCircle2, Cpu, Plus, RefreshCw } from '@lucide/vue'
import { z } from 'zod'
import type { CodigoListItem } from '@backend/services/codigos'

type StatusPainel = 'sem_teste' | 'em_andamento' | 'aprovado' | 'reprovado'

interface DadosPainel {
  metricas: { total_codigos: number; em_bancada: number; em_campo: number; com_falhas: number }
  distribuicao: Array<{ status: StatusPainel; total: number }>
  codigos_por_mes: Array<{ periodo: string; total: number }>
  codigos_recentes: CodigoListItem[]
}

const auth = useAuthStore()
const carregando = ref(true)
const erro = ref('')
const dados = ref<DadosPainel | null>(null)

const painelSchema = z.object({
  metricas: z.object({
    total_codigos: z.number().int().nonnegative(),
    em_bancada: z.number().int().nonnegative(),
    em_campo: z.number().int().nonnegative(),
    com_falhas: z.number().int().nonnegative(),
  }),
  distribuicao: z.array(z.object({
    status: z.enum(['sem_teste', 'em_andamento', 'aprovado', 'reprovado']),
    total: z.number().int().nonnegative(),
  })),
  codigos_por_mes: z.array(z.object({
    periodo: z.string(),
    total: z.number().int().nonnegative(),
  })),
  codigos_recentes: z.array(z.object({
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
    ocorrencias_abertas: z.number().int().nonnegative(),
  })),
})

const indicadores = computed(() => [
  { titulo: 'Códigos cadastrados', valor: dados.value?.metricas.total_codigos ?? 0, detalhe: 'Veículos ativos no catálogo', icon: Cpu, tone: 'primary' as const },
  { titulo: 'Em bancada', valor: dados.value?.metricas.em_bancada ?? 0, detalhe: 'Último teste de bancada em andamento', icon: Activity, tone: 'warning' as const },
  { titulo: 'Em campo', valor: dados.value?.metricas.em_campo ?? 0, detalhe: 'Último teste de campo em andamento', icon: Activity, tone: 'warning' as const },
  { titulo: 'Com falhas abertas', valor: dados.value?.metricas.com_falhas ?? 0, detalhe: 'Veículos com ocorrências não resolvidas', icon: AlertTriangle, tone: 'danger' as const },
])
const maximoMensal = computed(() => Math.max(1, ...(dados.value?.codigos_por_mes.map((item: DadosPainel['codigos_por_mes'][number]) => item.total) ?? [0])))
const totalDistribuicao = computed(() => (dados.value?.distribuicao ?? []).reduce((total: number, item: DadosPainel['distribuicao'][number]) => total + item.total, 0))
const partesRosca = computed(() => {
  const cores = {
    aprovado: 'hsl(var(--success))',
    reprovado: 'hsl(var(--danger))',
    em_andamento: 'hsl(var(--warning))',
    sem_teste: 'hsl(var(--neutral))',
  }
  let inicio = 0
  const trechos = (dados.value?.distribuicao ?? []).map((item: DadosPainel['distribuicao'][number]) => {
    const largura = totalDistribuicao.value ? item.total / totalDistribuicao.value * 100 : 0
    const trecho = `${cores[item.status]} ${inicio}% ${inicio + largura}%`
    inicio += largura
    return trecho
  })
  return trechos.length ? `conic-gradient(${trechos.join(', ')})` : 'conic-gradient(hsl(var(--surface-muted)) 0% 100%)'
})

const nomesStatus: Record<string, string> = {
  sem_teste: 'Sem testes',
  em_andamento: 'Em andamento',
  aprovado: 'Aprovados',
  reprovado: 'Reprovados',
}
const tonsStatus: Record<string, 'neutral' | 'warning' | 'success' | 'danger'> = {
  sem_teste: 'neutral',
  em_andamento: 'warning',
  aprovado: 'success',
  reprovado: 'danger',
}

function formatarMes(periodo: string) {
  const [ano, mes] = periodo.split('-')
  if (!ano || !mes) return periodo
  return new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(Number(ano), Number(mes) - 1, 1))
}

function formatarData(data: string) {
  const valor = new Date(data.length === 10 ? `${data}T12:00:00` : data)
  return Number.isNaN(valor.getTime())
    ? data
    : new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(valor)
}

async function carregarPainel() {
  carregando.value = true
  erro.value = ''
  try {
    const resposta = painelSchema.safeParse(await $fetch<unknown>('/api/painel'))
    if (!resposta.success) throw new Error('Os dados recebidos do painel estão em um formato inválido.')
    dados.value = resposta.data
  } catch (error: unknown) {
    erro.value = mensagemDeErro(error, 'Não foi possível carregar os indicadores do painel.')
  } finally {
    carregando.value = false
  }
}

onMounted(() => void carregarPainel())
</script>

<template>
  <AppShell title="Visão geral" description="Acompanhe o catálogo e a atividade de validação dos veículos.">
    <template #actions>
      <NuxtLink to="/codigos" class="interactive inline-flex min-h-10 items-center gap-2 rounded-control border border-border bg-surface px-3.5 text-xs font-semibold text-foreground hover:bg-surface-raised sm:text-sm">
        <Cpu :size="15" aria-hidden="true" /> Ver códigos
      </NuxtLink>
      <NuxtLink v-if="auth.papel === 'admin' || auth.papel === 'engenharia'" to="/codigos/novo" class="interactive inline-flex min-h-10 items-center gap-2 rounded-control bg-primary px-3.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover sm:text-sm">
        <Plus :size="15" aria-hidden="true" /> Novo código
      </NuxtLink>
    </template>

    <section class="surface-card relative overflow-hidden p-5 sm:p-7">
      <div class="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-info-surface/70 blur-3xl" />
      <div class="relative flex flex-wrap items-start justify-between gap-5">
        <div class="max-w-2xl">
          <UiBadge tone="success" dot>Conta ativa</UiBadge>
          <p class="mt-4 text-sm font-medium text-foreground-muted">Bem-vindo(a) ao ChipTest</p>
          <h2 class="mt-1 text-2xl font-bold tracking-[-0.04em] sm:text-3xl">{{ auth.perfil?.nome }}</h2>
          <p class="mt-2 text-sm leading-6 text-foreground-muted">{{ auth.perfil?.setor }} · {{ auth.perfil?.papel }}</p>
        </div>
        <div class="text-right text-xs text-foreground-muted">
          <p class="font-semibold text-foreground">Dados do catálogo em tempo real</p>
          <p class="mt-1">Atualizado ao carregar esta página</p>
        </div>
      </div>
    </section>

    <AppAlert v-if="erro" tone="error" class="mt-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <span>{{ erro }}</span>
        <UiButton variant="secondary" size="sm" @click="carregarPainel"><template #icon><RefreshCw :size="14" aria-hidden="true" /></template>Tentar novamente</UiButton>
      </div>
    </AppAlert>

    <section aria-label="Indicadores do ChipTest" class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <template v-if="carregando">
        <UiCard v-for="item in 4" :key="item" padding="compact">
          <UiSkeleton variant="heading" />
          <div class="mt-4"><UiSkeleton variant="block" /></div>
          <div class="mt-4"><UiSkeleton variant="line" /></div>
        </UiCard>
      </template>
      <UiMetricCard
        v-else
        v-for="item in indicadores"
        :key="item.titulo"
        :title="item.titulo"
        :value="item.valor"
        :detail="item.detalhe"
        :icon="item.icon"
        :tone="item.tone"
      />
    </section>

    <div class="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
      <UiCard>
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-sm font-bold">Códigos cadastrados</h2>
            <p class="mt-1 text-xs text-foreground-muted">Evolução mensal nos últimos seis meses</p>
          </div>
          <UiBadge tone="neutral">6 meses</UiBadge>
        </div>
        <div v-if="carregando" class="mt-6 flex h-48 items-end gap-3 border-b border-border pb-6 sm:gap-5">
          <UiSkeleton v-for="item in 6" :key="item" variant="block" class="h-28 flex-1" />
        </div>
        <div v-else-if="dados" class="mt-6">
          <div class="flex h-48 items-end gap-3 border-b border-border pb-6 sm:gap-5">
            <div v-for="mes in dados.codigos_por_mes" :key="mes.periodo" class="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
              <span class="font-mono text-[10px] text-foreground-muted">{{ mes.total }}</span>
              <div class="flex h-[78%] w-full items-end justify-center">
                <div
                  class="w-full max-w-12 rounded-t-control bg-primary/85 transition-[height] duration-300"
                  :style="{ height: `${mes.total ? Math.max(8, mes.total / maximoMensal * 100) : 0}%` }"
                  :aria-label="`${mes.total} códigos em ${formatarMes(mes.periodo)}`"
                />
              </div>
              <span class="text-[10px] capitalize text-foreground-subtle">{{ formatarMes(mes.periodo) }}</span>
            </div>
          </div>
          <p class="mt-3 text-[11px] text-foreground-subtle">Contagem de cadastros não excluídos por mês.</p>
        </div>
      </UiCard>

      <UiCard>
        <div>
          <h2 class="text-sm font-bold">Distribuição por status</h2>
          <p class="mt-1 text-xs text-foreground-muted">Resultado do teste mais recente de cada código</p>
        </div>
        <div v-if="carregando" class="mt-5 flex items-center gap-5">
          <UiSkeleton variant="avatar" class="h-32 w-32 rounded-full" />
          <div class="flex-1 space-y-3"><UiSkeleton v-for="item in 4" :key="item" variant="line" /></div>
        </div>
        <div v-else-if="dados" class="mt-5 flex flex-wrap items-center justify-center gap-5 sm:justify-start">
          <div class="relative grid h-32 w-32 shrink-0 place-items-center rounded-full" :style="{ background: partesRosca }" role="img" :aria-label="`Distribuição de status para ${totalDistribuicao} códigos`">
            <div class="grid h-[5.25rem] w-[5.25rem] place-items-center rounded-full bg-surface text-center">
              <div><p class="font-mono text-xl font-semibold">{{ totalDistribuicao }}</p><p class="text-[9px] text-foreground-subtle">códigos</p></div>
            </div>
          </div>
          <ul class="min-w-[140px] flex-1 space-y-2.5">
            <li v-for="item in dados.distribuicao" :key="item.status" class="flex items-center justify-between gap-3">
              <span class="flex items-center gap-2"><UiBadge :tone="tonsStatus[item.status]" dot>{{ nomesStatus[item.status] }}</UiBadge></span>
              <span class="font-mono text-xs font-semibold">{{ item.total }}</span>
            </li>
            <li v-if="!dados.distribuicao.length" class="text-xs text-foreground-muted">Nenhum código cadastrado.</li>
          </ul>
        </div>
      </UiCard>
    </div>

    <div class="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
      <UiCard>
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-sm font-bold">Adicionados recentemente</h2>
            <p class="mt-1 text-xs text-foreground-muted">Últimos veículos incluídos no catálogo</p>
          </div>
          <NuxtLink to="/codigos" class="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover">Ver todos <ArrowRight :size="14" aria-hidden="true" /></NuxtLink>
        </div>
        <div v-if="carregando" class="mt-4 space-y-3">
          <UiSkeleton v-for="item in 4" :key="item" variant="block" />
        </div>
        <ul v-else-if="dados?.codigos_recentes.length" class="mt-3 divide-y divide-border">
          <li v-for="codigo in dados.codigos_recentes" :key="codigo.id" class="flex flex-wrap items-center justify-between gap-3 py-3">
            <div class="min-w-0">
              <NuxtLink :to="`/codigos/${codigo.id}`" class="font-mono text-xs font-semibold text-primary hover:text-primary-hover">{{ codigo.codigo }}</NuxtLink>
              <p class="mt-1 truncate text-xs font-medium">{{ codigo.marca }} {{ codigo.modelo }}<span v-if="codigo.ano" class="font-normal text-foreground-muted"> · {{ codigo.ano }}</span></p>
            </div>
            <span class="text-[10px] text-foreground-subtle">{{ formatarData(codigo.criado_em) }}</span>
          </li>
        </ul>
        <div v-else class="mt-4">
          <UiEmptyState title="Nenhum código cadastrado" description="Adicione o primeiro veículo para começar a acompanhar o catálogo." :icon="Cpu">
            <template v-if="auth.papel === 'admin' || auth.papel === 'engenharia'" #action>
              <NuxtLink to="/codigos/novo" class="text-xs font-semibold text-primary hover:text-primary-hover">Cadastrar primeiro código</NuxtLink>
            </template>
          </UiEmptyState>
        </div>
      </UiCard>

      <UiCard>
        <h2 class="text-sm font-bold">Acesso rápido</h2>
        <p class="mt-1 text-xs text-foreground-muted">Atalhos para as tarefas mais comuns</p>
        <div class="mt-4 space-y-2">
          <NuxtLink to="/codigos" class="interactive flex min-h-12 items-center justify-between gap-3 rounded-control border border-border bg-surface px-3.5 text-xs font-semibold hover:bg-surface-raised">
            <span class="flex items-center gap-2.5"><Cpu :size="16" class="text-info" aria-hidden="true" /> Consultar códigos</span><ArrowRight :size="14" class="text-foreground-subtle" aria-hidden="true" />
          </NuxtLink>
          <NuxtLink v-if="auth.papel === 'admin' || auth.papel === 'engenharia'" to="/codigos/novo" class="interactive flex min-h-12 items-center justify-between gap-3 rounded-control border border-border bg-surface px-3.5 text-xs font-semibold hover:bg-surface-raised">
            <span class="flex items-center gap-2.5"><Plus :size="16" class="text-info" aria-hidden="true" /> Cadastrar veículo</span><ArrowRight :size="14" class="text-foreground-subtle" aria-hidden="true" />
          </NuxtLink>
          <NuxtLink v-if="auth.perfil?.papel === 'admin'" to="/admin/usuarios" class="interactive flex min-h-12 items-center justify-between gap-3 rounded-control border border-border bg-surface px-3.5 text-xs font-semibold hover:bg-surface-raised">
            <span class="flex items-center gap-2.5"><CheckCircle2 :size="16" class="text-success" aria-hidden="true" /> Gerenciar usuários</span><ArrowRight :size="14" class="text-foreground-subtle" aria-hidden="true" />
          </NuxtLink>
        </div>
        <p class="mt-4 border-t border-border pt-3 text-[11px] leading-5 text-foreground-subtle">Os indicadores são consultados no D1 e respeitam o catálogo ativo.</p>
      </UiCard>
    </div>
  </AppShell>
</template>
