<script setup lang="ts">
import { Activity, ArrowLeft, CheckCircle2, Clock3, Copy, FileText, History, MinusCircle, Pencil, RefreshCw, ShieldAlert, Trash2, Upload, XCircle } from '@lucide/vue'
import { computed, onMounted, ref, watch } from 'vue'
import { z } from 'zod'
import { tipoSecaoBancoSchema, type TipoSecaoBanco } from '@backend/schemas/importacoes'
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
const carregandoSecoes = ref(false)
const carregandoTestes = ref(false)
const aba = ref<'secoes' | 'alteracoes'>('secoes')
const secaoSelecionada = ref<TipoSecaoBanco>('dados_central')
const tiposTeste = ['bancada', 'campo'] as const
const testesCodigo = ref<Array<{
  id: string
  tipo: 'bancada' | 'campo'
  numero: number
  status: 'em_andamento' | 'aprovado' | 'reprovado' | 'cancelado'
  data_inicio: string
  responsavel_nome: string
  total_itens: number
  itens_testados: number
  itens_aprovados: number
  itens_reprovados: number
  percentual_aprovado: number
}>>([])
const comparacoes = ref<Array<{
  codigo_item_id: string
  nome_snapshot: string
  numero_campo: number
  numero_bancada_reprovado: number
}>>([])
const ultimosResultados = ref<Array<{
  codigo_item_id: string
  tipo: 'bancada' | 'campo'
  numero: number
  status_teste: 'em_andamento' | 'aprovado' | 'reprovado' | 'cancelado'
  resultado: 'nao_testado' | 'aprovado' | 'reprovado' | 'nao_se_aplica'
}>>([])
const itensImportados = ref<Array<{
  id: string
  tipo_secao: TipoSecaoBanco
  nome_completo: string
  nome_original: string
  nome_pt: string | null
  ordem: number
  versao: number
  atualizado_em: string
}>>([])
const modalExclusao = ref(false)
const removendo = ref(false)
const erroExclusao = ref('')
const notificacaoSalva = ref(false)
const descricaoNotificacao = ref('')

const secoes = [
  { id: 'dados_central', titulo: 'Dados da central', abrev: 'Dados da central' },
  { id: 'sensores', titulo: 'Sensores', abrev: 'Sensores' },
  { id: 'estados', titulo: 'Estados', abrev: 'Estados' },
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
    status_teste: z.enum(['em_andamento', 'aprovado', 'reprovado', 'cancelado']).nullable(),
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
const podeIniciarTeste = computed(() => Boolean(auth.perfil.value?.ativo))
const secaoAtiva = computed(() => secoes.find(secao => secao.id === secaoSelecionada.value) ?? secoes[0]!)
const itensSecaoAtiva = computed(() => itensImportados.value.filter(item => item.tipo_secao === secaoAtiva.value.id))

function quantidadeItens(tipo: string) {
  return itensImportados.value.filter(item => item.tipo_secao === tipo).length
}

const status = computed(() => {
  if (codigo.value?.ocorrencias_abertas) return { label: 'Com falhas abertas', tone: 'danger' as const, icon: XCircle }
  if (codigo.value?.status_teste === 'aprovado') return { label: 'Aprovado', tone: 'success' as const, icon: CheckCircle2 }
  if (codigo.value?.status_teste === 'reprovado') return { label: 'Reprovado', tone: 'danger' as const, icon: XCircle }
  if (codigo.value?.status_teste === 'em_andamento') return { label: 'Em andamento', tone: 'warning' as const, icon: Clock3 }
  if (codigo.value?.status_teste === 'cancelado') return { label: 'Cancelado', tone: 'neutral' as const, icon: MinusCircle }
  return { label: 'Sem testes', tone: 'neutral' as const, icon: ShieldAlert }
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
    await Promise.all([carregarSecoes(), carregarTestes()])
  } catch (error: unknown) {
    erro.value = mensagemDeErro(error, 'Não foi possível carregar este código.')
  } finally {
    carregando.value = false
  }
}

async function carregarTestes() {
  carregandoTestes.value = true
  try {
    const resposta = z.object({
      testes: z.array(z.object({
        id: z.string().uuid(),
        tipo: z.enum(['bancada', 'campo']),
        numero: z.number().int().positive(),
        status: z.enum(['em_andamento', 'aprovado', 'reprovado', 'cancelado']),
        data_inicio: z.string(),
        responsavel_nome: z.string(),
        total_itens: z.number().int().nonnegative(),
        itens_testados: z.number().int().nonnegative(),
        itens_aprovados: z.number().int().nonnegative(),
        itens_reprovados: z.number().int().nonnegative(),
        percentual_aprovado: z.number().int().nonnegative(),
      })),
      ultimos_resultados: z.array(z.object({
        codigo_item_id: z.string().uuid(),
        tipo: z.enum(['bancada', 'campo']),
        numero: z.number().int().positive(),
        status_teste: z.enum(['em_andamento', 'aprovado', 'reprovado', 'cancelado']),
        resultado: z.enum(['nao_testado', 'aprovado', 'reprovado', 'nao_se_aplica']),
        data_inicio: z.string(),
      })),
      comparacoes: z.array(z.object({
        codigo_item_id: z.string().uuid(),
        nome_snapshot: z.string(),
        numero_campo: z.number().int(),
        numero_bancada_reprovado: z.number().int(),
      })),
    }).safeParse(await $fetch<unknown>(`/api/codigos/${codigoId.value}/testes`))
    if (!resposta.success) throw new Error('O histórico de testes recebido está em formato inválido.')
    testesCodigo.value = resposta.data.testes
    ultimosResultados.value = resposta.data.ultimos_resultados
    comparacoes.value = resposta.data.comparacoes
  } catch (error: unknown) {
    erro.value = mensagemDeErro(error, 'Não foi possível carregar o histórico de testes.')
  } finally {
    carregandoTestes.value = false
  }
}

function resultadoRecente(itemId: string, tipo: 'bancada' | 'campo') {
  return ultimosResultados.value.find(resultado => resultado.codigo_item_id === itemId && resultado.tipo === tipo) ?? null
}

function rotuloResultado(resultado: NonNullable<ReturnType<typeof resultadoRecente>>) {
  if (resultado.resultado === 'aprovado') return 'Aprovado'
  if (resultado.resultado === 'reprovado') return 'Reprovado'
  if (resultado.resultado === 'nao_se_aplica') return 'N/A'
  return 'Não testado'
}

function iconeResultado(resultado: NonNullable<ReturnType<typeof resultadoRecente>>) {
  if (resultado.resultado === 'aprovado') return CheckCircle2
  if (resultado.resultado === 'reprovado') return XCircle
  if (resultado.resultado === 'nao_se_aplica') return MinusCircle
  return Clock3
}

function tomResultado(resultado: NonNullable<ReturnType<typeof resultadoRecente>>) {
  if (resultado.resultado === 'aprovado') return 'text-success'
  if (resultado.resultado === 'reprovado') return 'text-danger'
  if (resultado.resultado === 'nao_se_aplica') return 'text-neutral'
  return 'text-foreground-muted'
}

async function carregarSecoes() {
  if (!codigoId.value) return
  carregandoSecoes.value = true
  try {
    const resposta = z.object({
      itens: z.array(z.object({
        id: z.string().uuid(),
        tipo_secao: tipoSecaoBancoSchema,
        nome_completo: z.string(),
        nome_original: z.string(),
        nome_pt: z.string().nullable(),
        ordem: z.number().int().positive(),
        versao: z.number().int().positive(),
        atualizado_em: z.string(),
      })),
    }).safeParse(await $fetch<unknown>(`/api/codigos/${codigoId.value}/itens`))
    if (!resposta.success) throw new Error('Os itens recebidos estão em um formato inválido.')
    itensImportados.value = resposta.data.itens
  } catch (error: unknown) {
    erro.value = mensagemDeErro(error, 'Não foi possível carregar os itens técnicos.')
  } finally {
    carregandoSecoes.value = false
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
  <AppShell :title="codigo ? `${codigo.marca} ${codigo.modelo}` : 'Detalhe do código'" description="Informações técnicas, itens de diagnóstico e histórico de atividade do veículo.">
    <template #actions>
      <NuxtLink to="/codigos" class="interactive inline-flex min-h-10 items-center gap-2 rounded-control border border-border bg-surface px-3 text-xs font-semibold hover:bg-surface-raised">
        <ArrowLeft :size="15" aria-hidden="true" /><span class="hidden sm:inline">Voltar aos códigos</span><span class="sm:hidden">Voltar</span>
      </NuxtLink>
      <template v-if="codigo && podeGerenciar">
        <NuxtLink :to="`/importacoes/nova?codigo=${codigo.id}`" class="interactive inline-flex min-h-9 items-center gap-2 rounded-control bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary-hover">
          <Upload :size="14" aria-hidden="true" /><span>Importar Word</span>
        </NuxtLink>
        <UiButton variant="secondary" size="sm" @click="duplicarCodigo"><template #icon><Copy :size="14" aria-hidden="true" /></template><span class="hidden sm:inline">Duplicar</span></UiButton>
        <NuxtLink :to="`/codigos/${codigo.id}/editar`" class="interactive inline-flex min-h-9 items-center gap-2 rounded-control border border-border bg-surface px-3 text-xs font-semibold hover:bg-surface-raised"><Pencil :size="14" aria-hidden="true" /> Editar</NuxtLink>
      </template>
        <NuxtLink v-if="codigo && podeIniciarTeste" :to="`/codigos/${codigo.id}/testes/novo`" class="interactive inline-flex min-h-9 items-center gap-2 rounded-control bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary-hover">
          <Activity :size="14" aria-hidden="true" /> Novo teste
        </NuxtLink>
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
              <UiBadge :tone="status.tone"><component :is="status.icon" :size="14" aria-hidden="true" />{{ status.label }}</UiBadge>
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
            @click="secaoSelecionada = secao.id as TipoSecaoBanco"
          >
            <span class="truncate">{{ secao.abrev }}</span>
            <UiBadge :tone="quantidadeItens(secao.id) ? 'success' : 'neutral'">{{ quantidadeItens(secao.id) }}</UiBadge>
          </button>
        </nav>

        <UiCard class="min-h-[340px]">
          <div class="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
            <div><p class="text-[10px] font-bold uppercase tracking-[0.13em] text-foreground-subtle">Itens técnicos</p><h2 class="mt-1 text-base font-bold">{{ secaoAtiva.titulo }}</h2></div>
            <div class="flex flex-wrap items-center gap-2">
              <UiBadge :tone="itensSecaoAtiva.length ? 'success' : 'neutral'">{{ itensSecaoAtiva.length }} {{ itensSecaoAtiva.length === 1 ? 'item' : 'itens' }}</UiBadge>
              <NuxtLink v-if="podeGerenciar" :to="`/importacoes/nova?codigo=${codigo?.id}`" class="interactive inline-flex min-h-8 items-center gap-1.5 rounded-control border border-border bg-surface px-2.5 text-[11px] font-semibold hover:bg-surface-raised">
                <Upload :size="13" aria-hidden="true" /> Reimportar
              </NuxtLink>
            </div>
          </div>
          <div v-if="carregandoSecoes" class="space-y-3 py-6"><UiSkeleton variant="block" /><UiSkeleton variant="block" /></div>
          <ul v-else-if="itensSecaoAtiva.length" class="divide-y divide-border">
            <li v-for="item in itensSecaoAtiva" :key="item.id" class="flex flex-wrap items-start justify-between gap-3 py-3">
              <div class="min-w-0">
                <p class="break-words text-sm font-semibold">{{ item.nome_completo }}</p>
                <p v-if="item.nome_pt" class="mt-1 text-xs text-foreground-muted">{{ item.nome_original }} <span aria-hidden="true">/</span> {{ item.nome_pt }}</p>
                <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
                  <span v-for="tipo in tiposTeste" :key="tipo" class="inline-flex items-center gap-1" :class="resultadoRecente(item.id, tipo) ? tomResultado(resultadoRecente(item.id, tipo)!) : 'text-foreground-subtle'">
                    <component :is="resultadoRecente(item.id, tipo) ? iconeResultado(resultadoRecente(item.id, tipo)!) : Clock3" :size="12" aria-hidden="true" />
                    {{ tipo === 'bancada' ? 'Bancada' : 'Campo' }}:
                    {{ resultadoRecente(item.id, tipo) ? `${rotuloResultado(resultadoRecente(item.id, tipo)!)} · teste ${resultadoRecente(item.id, tipo)!.numero}` : 'Sem resultado' }}
                  </span>
                </div>
              </div>
              <span class="shrink-0 text-right text-[10px] text-foreground-subtle"><span class="font-mono">v{{ item.versao }}</span><span class="mt-1 block">{{ formatarData(item.atualizado_em) }}</span></span>
            </li>
          </ul>
          <div v-else class="grid min-h-[245px] place-items-center py-8">
            <UiEmptyState title="Nenhum item importado ainda" description="Importe o documento técnico para carregar os nomes dos itens desta seção. Falhas ficam fora do escopo desta importação." :icon="FileText">
              <template v-if="podeGerenciar" #action>
                <NuxtLink :to="`/importacoes/nova?codigo=${codigo?.id}`" class="interactive inline-flex min-h-9 items-center gap-2 rounded-control bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary-hover">
                  <FileText :size="14" aria-hidden="true" /> Importar Word
                </NuxtLink>
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
            <div v-if="carregandoTestes" class="space-y-3"><UiSkeleton v-for="item in 2" :key="item" variant="block" /></div>
            <UiEmptyState v-else-if="!testesCodigo.length" title="Nenhum teste registrado" description="Inicie o primeiro checklist de bancada ou campo para registrar a validação dos itens." :icon="ShieldAlert">
              <template v-if="podeIniciarTeste" #action>
                <NuxtLink :to="`/codigos/${codigo?.id}/testes/novo`" class="interactive inline-flex min-h-9 items-center gap-2 rounded-control bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary-hover"><Activity :size="14" aria-hidden="true" /> Novo teste</NuxtLink>
              </template>
            </UiEmptyState>
            <ol v-else class="relative space-y-4 border-l border-border pl-4">
              <li v-for="teste in testesCodigo" :key="teste.id" class="relative">
                <span class="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-primary bg-surface" aria-hidden="true" />
                <NuxtLink :to="`/testes/${teste.id}`" class="block rounded-control p-2 transition-colors hover:bg-surface-raised">
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-xs font-semibold">{{ teste.tipo === 'bancada' ? 'Bancada' : 'Campo' }} · nº {{ teste.numero }}</span>
                    <UiBadge v-if="teste.status === 'em_andamento'" tone="warning"><Clock3 :size="12" aria-hidden="true" /> Em andamento</UiBadge>
                    <UiBadge v-else-if="teste.status === 'aprovado'" tone="success"><CheckCircle2 :size="12" aria-hidden="true" /> Aprovado</UiBadge>
                    <UiBadge v-else-if="teste.status === 'reprovado'" tone="danger"><XCircle :size="12" aria-hidden="true" /> Reprovado</UiBadge>
                    <UiBadge v-else tone="neutral"><MinusCircle :size="12" aria-hidden="true" /> Cancelado</UiBadge>
                  </div>
                  <p class="mt-1 text-[10px] text-foreground-muted">{{ formatarData(teste.data_inicio) }} · {{ teste.responsavel_nome }}</p>
                  <p class="mt-2 text-[10px] text-foreground-subtle">{{ teste.itens_aprovados }}/{{ teste.itens_testados }} testados aprovados · {{ teste.percentual_aprovado }}%</p>
                </NuxtLink>
              </li>
            </ol>
            <div v-if="comparacoes.length" class="mt-4 rounded-control border border-info/25 bg-info-surface p-3">
              <p class="inline-flex items-center gap-1.5 text-[10px] font-bold text-info"><Activity :size="13" aria-hidden="true" /> Comparativo bancada × campo</p>
              <ul class="mt-2 space-y-2">
                <li v-for="comparacao in comparacoes" :key="comparacao.codigo_item_id" class="text-[10px] leading-4">
                  <span class="font-semibold">{{ comparacao.nome_snapshot }}</span><br>
                  <span class="text-foreground-muted">Reprovou na bancada nº {{ comparacao.numero_bancada_reprovado }} e aprovou no campo nº {{ comparacao.numero_campo }}.</span>
                </li>
              </ul>
            </div>
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

      <style scoped>
      .rich-content :deep(table) { width: 100%; border-collapse: collapse; }
      .rich-content :deep(th), .rich-content :deep(td) { border: 1px solid hsl(var(--border)); padding: 0.55rem 0.7rem; text-align: left; }
      .rich-content :deep(th) { background: hsl(var(--surface-raised)); font-weight: 700; }
      .rich-content :deep(tbody tr:nth-child(even)) { background: hsl(var(--surface-raised)); }
      .rich-content :deep(ul), .rich-content :deep(ol) { margin: 0.65rem 0; padding-left: 1.5rem; }
      .rich-content :deep(ul) { list-style: disc; }
      .rich-content :deep(ol) { list-style: decimal; }
      .rich-content :deep(p) { margin: 0.6rem 0; }
      .rich-content :deep(code), .rich-content :deep(pre) { border-radius: 0.35rem; background: hsl(var(--surface-raised)); font-family: var(--font-mono); }
      .rich-content :deep(code) { padding: 0.1rem 0.25rem; }
      .rich-content :deep(pre) { overflow: auto; padding: 0.75rem; }
      </style>
    </UiOverlay>
    <UiToast
      v-model="notificacaoSalva"
      title="Código salvo"
      :description="descricaoNotificacao"
    />
  </AppShell>
</template>
