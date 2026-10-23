<script setup lang="ts">
import { Activity, ArrowLeft, Copy, FileText, History, Pencil, RefreshCw, ShieldAlert, Trash2 } from '@lucide/vue'
import { z } from 'zod'
import type { AlteracaoCodigo, CodigoRecord } from '@backend/services/codigos'

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const codigoId = computed(() => String(route.params.id))
const carregando = ref(true)
const erro = ref('')
const codigo = ref<CodigoRecord | null>(null)
const alteracoes = ref<AlteracaoCodigo[]>([])
const carregandoHistorico = ref(false)
const aba = ref<'secoes' | 'alteracoes'>('secoes')
const secaoSelecionada = ref('dados_informacao_central')
const modalExclusao = ref(false)
const removendo = ref(false)
const erroExclusao = ref('')
const notificacaoSalva = ref(false)
const descricaoNotificacao = ref('')

const secoes = [
  { id: 'dados_informacao_central', titulo: 'Dados da informação da central', abrev: 'Dados da central' },
  { id: 'sensores_estados', titulo: 'Sensores e estados', abrev: 'Sensores e estados' },
  { id: 'falhas', titulo: 'Falhas', abrev: 'Falhas' },
  { id: 'atuadores', titulo: 'Atuadores', abrev: 'Atuadores' },
  { id: 'ajuste', titulo: 'Ajuste', abrev: 'Ajuste' },
  { id: 'parametrizacao', titulo: 'Parametrização', abrev: 'Parametrização' },
  { id: 'funcao_avancada', titulo: 'Função avançada', abrev: 'Função avançada' },
] as const

const codigoResponseSchema = z.object({
  codigo: z.object({
    id: z.string().uuid(),
    codigo: z.string(),
    marca: z.string(),
    modelo: z.string(),
    motor: z.string().nullable(),
    ano: z.number().nullable(),
    observacoes: z.string().nullable(),
    criado_em: z.string(),
    atualizado_em: z.string().nullable(),
    criado_por: z.string().nullable(),
    setor_id: z.string().uuid().nullable(),
    setor: z.string().nullable(),
    ultimo_teste: z.string().nullable(),
    ultimo_teste_data: z.string().nullable(),
    ultimo_teste_tipo: z.enum(['bancada', 'campo']).nullable(),
    status_teste: z.enum(['em_andamento', 'aprovado', 'reprovado']).nullable(),
    ocorrencias_abertas: z.number().int().nonnegative(),
  }),
})
const historicoResponseSchema = z.object({
  alteracoes: z.array(z.object({
    id: z.string().uuid(),
    usuario_id: z.string().nullable(),
    usuario_nome: z.string().nullable(),
    antes: z.record(z.string(), z.unknown()).nullable(),
    depois: z.record(z.string(), z.unknown()).nullable(),
    criado_em: z.string(),
  })),
})

const podeGerenciar = computed(() => auth.can('codigos:gerenciar'))
const podeExcluir = computed(() => auth.can('codigos:excluir'))
const secaoAtiva = computed(() => secoes.find(secao => secao.id === secaoSelecionada.value) ?? secoes[0]!)

const status = computed(() => {
  if (codigo.value?.ocorrencias_abertas) return { label: 'Com falhas abertas', tone: 'danger' as const }
  if (codigo.value?.status_teste === 'aprovado') return { label: 'Aprovado', tone: 'success' as const }
  if (codigo.value?.status_teste === 'reprovado') return { label: 'Reprovado', tone: 'danger' as const }
  if (codigo.value?.status_teste === 'em_andamento') return { label: 'Em andamento', tone: 'warning' as const }
  return { label: 'Sem testes', tone: 'neutral' as const }
})

const rotulosCampos: Record<string, string> = {
  codigo: 'Código',
  marca: 'Marca',
  modelo: 'Modelo',
  motor: 'Motor',
  ano: 'Ano',
  observacoes: 'Observações',
  excluido_em: 'Exclusão lógica',
}

function valorCampo(valor: unknown) {
  if (valor === null || valor === undefined || valor === '') return '—'
  if (typeof valor === 'object') return JSON.stringify(valor)
  return String(valor)
}

function camposAlterados(item: AlteracaoCodigo) {
  const antes = item.antes ?? {}
  const depois = item.depois ?? {}
  const campos = new Set([...Object.keys(antes), ...Object.keys(depois)])
  return [...campos]
    .filter(campo => campo !== 'id' && valorCampo(antes[campo]) !== valorCampo(depois[campo]))
    .map(campo => ({
      nome: rotulosCampos[campo] ?? campo,
      antes: valorCampo(antes[campo]),
      depois: valorCampo(depois[campo]),
    }))
}

function formatarData(data: string) {
  const valor = new Date(data.length === 10 ? `${data}T12:00:00` : data)
  return Number.isNaN(valor.getTime())
    ? data
    : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(valor)
}

async function carregarCodigo() {
  carregando.value = true
  erro.value = ''
  try {
    const resposta = codigoResponseSchema.safeParse(await $fetch<unknown>(`/api/codigos/${codigoId.value}`))
    if (!resposta.success) throw new Error('Os dados recebidos do código estão em um formato inválido.')
    codigo.value = resposta.data.codigo
  } catch (error: unknown) {
    erro.value = mensagemDeErro(error, 'Não foi possível carregar este código.')
  } finally {
    carregando.value = false
  }
}

async function carregarHistorico() {
  carregandoHistorico.value = true
  try {
    const resposta = historicoResponseSchema.safeParse(await $fetch<unknown>(`/api/codigos/${codigoId.value}/historico`))
    if (!resposta.success) throw new Error('O histórico recebido está em um formato inválido.')
    alteracoes.value = resposta.data.alteracoes
  } catch (error: unknown) {
    erro.value = mensagemDeErro(error, 'Não foi possível carregar o histórico de alterações.')
  } finally {
    carregandoHistorico.value = false
  }
}

async function duplicarCodigo() {
  if (!codigo.value) return
  erro.value = ''
  try {
    const resposta = await $fetch<{ id: string }>(`/api/codigos/${codigo.value.id}/duplicar`, { method: 'POST' })
    await navigateTo(`/codigos/${resposta.id}`)
  } catch (error: unknown) {
    erro.value = mensagemDeErro(error, 'Não foi possível duplicar o código.')
  }
}

async function excluirCodigo() {
  if (!codigo.value) return
  removendo.value = true
  erroExclusao.value = ''
  try {
    await $fetch(`/api/codigos/${codigo.value.id}`, { method: 'DELETE' })
    await navigateTo('/codigos')
  } catch (error: unknown) {
    erroExclusao.value = mensagemDeErro(error, 'Não foi possível excluir o código.')
  } finally {
    removendo.value = false
  }
}

watch(aba, (value: 'secoes' | 'alteracoes') => {
  if (value === 'alteracoes' && !alteracoes.value.length) void carregarHistorico()
})

onMounted(() => void carregarCodigo())

onMounted(() => {
  const salvo = route.query.salvo
  if (salvo !== 'novo' && salvo !== 'edicao') return
  notificacaoSalva.value = true
  descricaoNotificacao.value = salvo === 'edicao'
    ? 'As informações foram atualizadas.'
    : 'O código foi cadastrado com sucesso.'
  const query = { ...route.query }
  delete query.salvo
  void router.replace({ query })
})
</script>

<template>
  <AppShell :title="codigo ? `${codigo.marca} ${codigo.modelo}` : 'Detalhe do código'" description="Informações técnicas, conteúdo importado e histórico de atividade do veículo.">
    <template #actions>
      <NuxtLink to="/codigos" class="interactive inline-flex min-h-10 items-center gap-2 rounded-control border border-border bg-surface px-3 text-xs font-semibold hover:bg-surface-raised">
        <ArrowLeft :size="15" aria-hidden="true" /><span class="hidden sm:inline">Voltar aos códigos</span><span class="sm:hidden">Voltar</span>
      </NuxtLink>
      <template v-if="codigo && podeGerenciar">
        <UiButton variant="secondary" size="sm" @click="duplicarCodigo"><template #icon><Copy :size="14" aria-hidden="true" /></template><span class="hidden sm:inline">Duplicar</span></UiButton>
        <NuxtLink :to="`/codigos/${codigo.id}/editar`" class="interactive inline-flex min-h-9 items-center gap-2 rounded-control border border-border bg-surface px-3 text-xs font-semibold hover:bg-surface-raised"><Pencil :size="14" aria-hidden="true" /> Editar</NuxtLink>
      </template>
      <UiButton v-if="codigo && podeExcluir" variant="danger" size="sm" aria-label="Excluir código" @click="modalExclusao = true"><template #icon><Trash2 :size="14" aria-hidden="true" /></template><span class="hidden sm:inline">Excluir</span></UiButton>
    </template>

    <AppAlert v-if="erro" tone="error" class="mb-5">
      <div class="flex flex-wrap items-center justify-between gap-3"><span>{{ erro }}</span><UiButton variant="secondary" size="sm" @click="carregarCodigo"><template #icon><RefreshCw :size="14" aria-hidden="true" /></template>Tentar novamente</UiButton></div>
    </AppAlert>

    <div v-if="carregando" class="space-y-5">
      <UiCard><UiSkeleton variant="heading" /><div class="mt-5"><UiSkeleton variant="block" /></div></UiCard>
      <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]"><UiCard><UiSkeleton variant="block" /></UiCard><UiCard><UiSkeleton variant="block" /></UiCard></div>
    </div>
    <div v-else-if="codigo">
      <section class="surface-card relative overflow-hidden p-5 sm:p-6">
        <div class="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-info-surface/60 blur-3xl" />
        <div class="relative flex flex-wrap items-start justify-between gap-5">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2.5">
              <p class="font-mono text-xl font-bold tracking-tight text-primary sm:text-2xl">{{ codigo.codigo }}</p>
              <UiBadge :tone="status.tone" dot>{{ status.label }}</UiBadge>
            </div>
            <h2 class="mt-2 text-lg font-bold tracking-tight">{{ codigo.marca }} {{ codigo.modelo }}</h2>
            <p class="mt-1 text-sm text-foreground-muted">{{ codigo.motor || 'Motorização não informada' }}<span v-if="codigo.ano"> · Ano {{ codigo.ano }}</span></p>
          </div>
          <div class="grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
            <div><p class="text-[10px] uppercase tracking-wide text-foreground-subtle">Setor responsável</p><p class="mt-1 font-semibold">{{ codigo.setor || 'Não informado' }}</p></div>
            <div><p class="text-[10px] uppercase tracking-wide text-foreground-subtle">Último teste</p><p class="mt-1 font-semibold">{{ codigo.ultimo_teste_tipo ? `${codigo.ultimo_teste_tipo} · ${codigo.status_teste}` : 'Ainda sem testes' }}</p></div>
            <div><p class="text-[10px] uppercase tracking-wide text-foreground-subtle">Criado em</p><p class="mt-1 font-semibold">{{ formatarData(codigo.criado_em) }}</p></div>
            <div><p class="text-[10px] uppercase tracking-wide text-foreground-subtle">Ocorrências abertas</p><p class="mt-1 font-semibold">{{ codigo.ocorrencias_abertas }}</p></div>
          </div>
        </div>
        <p v-if="codigo.observacoes" class="relative mt-5 max-w-4xl border-t border-border pt-4 text-sm leading-6 text-foreground-muted">{{ codigo.observacoes }}</p>
      </section>

      <div class="mt-5 flex gap-1 border-b border-border" role="tablist" aria-label="Informações do código">
        <button type="button" role="tab" :aria-selected="aba === 'secoes'" class="interactive -mb-px inline-flex min-h-10 items-center gap-2 border-b-2 px-3 text-xs font-semibold" :class="aba === 'secoes' ? 'border-primary text-primary' : 'border-transparent text-foreground-muted hover:text-foreground'" @click="aba = 'secoes'"><FileText :size="15" aria-hidden="true" /> Seções técnicas</button>
        <button type="button" role="tab" :aria-selected="aba === 'alteracoes'" class="interactive -mb-px inline-flex min-h-10 items-center gap-2 border-b-2 px-3 text-xs font-semibold" :class="aba === 'alteracoes' ? 'border-primary text-primary' : 'border-transparent text-foreground-muted hover:text-foreground'" @click="aba = 'alteracoes'"><History :size="15" aria-hidden="true" /> Histórico de alterações</button>
      </div>

      <div v-if="aba === 'secoes'" class="mt-4 grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)_280px]">
        <nav class="surface-card h-fit p-2" aria-label="Seções técnicas">
          <p class="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.13em] text-foreground-subtle">Conteúdo do veículo</p>
          <button
            v-for="secao in secoes"
            :key="secao.id"
            type="button"
            class="interactive flex min-h-10 w-full items-center justify-between gap-2 rounded-control px-3 text-left text-xs font-medium"
            :class="secaoSelecionada === secao.id ? 'bg-info-surface text-info' : 'text-foreground-muted hover:bg-surface-raised hover:text-foreground'"
            :aria-current="secaoSelecionada === secao.id ? 'page' : undefined"
            @click="secaoSelecionada = secao.id"
          >
            <span class="truncate">{{ secao.abrev }}</span><span class="h-1.5 w-1.5 shrink-0 rounded-full bg-neutral/60" :aria-label="`${secao.titulo}: sem conteúdo`" />
          </button>
        </nav>

        <UiCard class="min-h-[340px]">
          <div class="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
            <div><p class="text-[10px] font-bold uppercase tracking-[0.13em] text-foreground-subtle">Seção técnica</p><h2 class="mt-1 text-base font-bold">{{ secaoAtiva.titulo }}</h2></div>
            <UiBadge tone="neutral">Não importado</UiBadge>
          </div>
          <div class="grid min-h-[245px] place-items-center py-8">
            <UiEmptyState title="Nenhum conteúdo importado ainda" description="Importe o documento técnico do veículo para preencher esta seção e permitir a conferência durante os testes." :icon="FileText">
              <template #action>
                <UiTooltip text="A importação de documentos será habilitada na próxima fase.">
                  <button type="button" disabled aria-disabled="true" class="inline-flex min-h-9 cursor-not-allowed items-center gap-2 rounded-control border border-border bg-surface px-3 text-xs font-semibold text-foreground-subtle opacity-70">
                    <FileText :size="14" aria-hidden="true" /> Importar Word
                  </button>
                </UiTooltip>
              </template>
            </UiEmptyState>
          </div>
        </UiCard>

        <aside class="surface-card h-fit p-4">
          <div class="flex items-center justify-between gap-2">
            <div><h2 class="text-xs font-bold">Histórico de testes</h2><p class="mt-1 text-[10px] text-foreground-muted">Atividade de bancada e campo</p></div>
            <Activity :size="16" class="text-foreground-subtle" aria-hidden="true" />
          </div>
          <div class="mt-4">
            <UiEmptyState title="Nenhum teste registrado" description="Os testes deste veículo aparecerão aqui quando o módulo de execução estiver disponível." :icon="ShieldAlert" />
          </div>
        </aside>
      </div>

      <section v-else class="surface-card mt-4 p-4 sm:p-5">
        <div class="flex items-start justify-between gap-4 border-b border-border pb-4">
          <div><h2 class="text-sm font-bold">Histórico de alterações</h2><p class="mt-1 text-xs text-foreground-muted">Registro de criação, edição e exclusão lógica deste código.</p></div>
          <UiButton variant="secondary" size="sm" :loading="carregandoHistorico" @click="carregarHistorico"><template #icon><RefreshCw :size="14" aria-hidden="true" /></template>Atualizar</UiButton>
        </div>
        <div v-if="carregandoHistorico" class="space-y-3 py-4"><UiSkeleton v-for="item in 3" :key="item" variant="block" /></div>
        <ul v-else-if="alteracoes.length" class="divide-y divide-border">
          <li v-for="item in alteracoes" :key="item.id" class="grid gap-3 py-4 sm:grid-cols-[160px_minmax(0,1fr)]">
            <div><p class="text-xs font-semibold">{{ item.usuario_nome || 'Usuário removido' }}</p><p class="mt-1 text-[10px] text-foreground-subtle">{{ formatarData(item.criado_em) }}</p></div>
            <div>
              <p class="text-xs font-semibold">{{ item.antes ? item.depois?.excluido_em ? 'Código excluído logicamente' : 'Cadastro atualizado' : 'Código criado' }}</p>
              <div v-if="camposAlterados(item).length" class="mt-2 overflow-x-auto rounded-control border border-border">
                <table class="w-full min-w-[440px] text-left text-[11px]">
                  <thead class="bg-surface-raised text-foreground-subtle"><tr><th class="px-3 py-2 font-semibold">Campo</th><th class="px-3 py-2 font-semibold">Antes</th><th class="px-3 py-2 font-semibold">Depois</th></tr></thead>
                  <tbody><tr v-for="campo in camposAlterados(item)" :key="campo.nome" class="border-t border-border"><td class="px-3 py-2 font-medium">{{ campo.nome }}</td><td class="px-3 py-2 text-foreground-muted">{{ campo.antes }}</td><td class="px-3 py-2 text-foreground">{{ campo.depois }}</td></tr></tbody>
                </table>
              </div>
              <p v-else class="mt-1 text-[11px] text-foreground-muted">Sem campos alterados disponíveis.</p>
            </div>
          </li>
        </ul>
        <div v-else class="py-5">
          <UiEmptyState title="Ainda não há alterações registradas" description="As mudanças feitas neste cadastro serão exibidas nesta linha do tempo." :icon="History" />
        </div>
      </section>
    </div>

    <UiOverlay v-model="modalExclusao" title="Excluir código?" description="A exclusão é lógica e preserva o histórico de testes e alterações.">
      <div class="space-y-4">
        <p class="text-sm leading-6 text-foreground-muted">O código <span class="font-mono font-semibold text-foreground">{{ codigo?.codigo }}</span> deixará de aparecer nas consultas normais, mas o registro e o histórico permanecerão preservados.</p>
        <AppAlert v-if="erroExclusao" tone="error">{{ erroExclusao }}</AppAlert>
      </div>
      <template #footer>
        <UiButton variant="secondary" :disabled="removendo" @click="modalExclusao = false">Cancelar</UiButton>
        <UiButton variant="danger" :loading="removendo" @click="excluirCodigo"><template #icon><Trash2 :size="14" aria-hidden="true" /></template>{{ removendo ? 'Excluindo...' : 'Excluir código' }}</UiButton>
      </template>
    </UiOverlay>
    <UiToast
      v-model="notificacaoSalva"
      title="Código salvo"
      :description="descricaoNotificacao"
    />
  </AppShell>
</template>
