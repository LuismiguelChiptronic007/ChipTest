<script setup lang="ts">
<<<<<<< HEAD
import { ArrowLeft, ChevronLeft, ChevronRight, LayoutDashboard, MessageSquare, Plus, RefreshCw } from '@lucide/vue'
import OcorrenciaStatusBadge from '../../components/ocorrencias/OcorrenciaStatusBadge.vue'
import LoadOverviewInline from '../../components/codigos/LoadOverviewInline.vue'
import { z } from 'zod'

const route = useRoute()
const telaAtual = ref<'visao_geral' | 'erros'>('visao_geral')
=======
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, RefreshCw } from '@lucide/vue'
import OcorrenciaStatusBadge from '../../components/ocorrencias/OcorrenciaStatusBadge.vue'
import LoadOverviewPinnedItem from '../../components/codigos/LoadOverviewPinnedItem.vue'
import { z } from 'zod'

const route = useRoute()
>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3
const testeId = computed(() => parametro('teste'))
const codigoId = computed(() => parametro('codigo'))
const tituloDsd = computed(() => parametro('dsd'))
const tituloPagina = computed(() => {
  const dsdCodigo = parametro('dsdCodigo')
  const marca = parametro('marca')
  const modelo = parametro('modelo')
  return dsdCodigo && marca && modelo
<<<<<<< HEAD
    ? `${dsdCodigo} - ${marca} - ${modelo} / ${codigoId.value && telaAtual.value === 'visao_geral' ? 'Visão geral' : 'Erros'}`
=======
    ? `${dsdCodigo} - ${marca} - ${modelo} / Erros`
>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3
    : 'Erros'
})
const destinoVoltar = computed(() => {
  if (testeId.value) return `/testes/${testeId.value}`
  if (parametro('origem') === 'testes') return '/testes'
  if (codigoId.value) return `/codigos/${codigoId.value}`
  return '/ocorrencias'
})
const carregandoErros = ref(true)
const erroErros = ref('')
const paginaErros = ref(1)
const limiteErros = 25
const dadosErros = ref<{
  ocorrencias: Array<{
    id: string
    tipo_teste: string | null
    titulo: string
    status: 'aberta' | 'em_analise' | 'resolvida' | 'descartada'
    relator_nome: string
    criado_em: string
  }>
  total: number
  total_paginas: number
} | null>(null)

const respostaErrosSchema = z.object({
  ocorrencias: z.array(z.object({
    id: z.string().uuid(),
    tipo_teste: z.string().nullable(),
    titulo: z.string(),
    status: z.enum(['aberta', 'em_analise', 'resolvida', 'descartada']),
    relator_nome: z.string(),
    criado_em: z.string(),
  })),
  total: z.number().int().nonnegative(),
  total_paginas: z.number().int().positive(),
})

function parametro(nome: string): string {
  const valor = route.query[nome]
  return typeof valor === 'string' ? valor : ''
}

function destinoDetalhe(id: string) {
  return {
    path: `/ocorrencias/${id}`,
    query: { voltar: route.fullPath },
  }
}

function formatarData(data: string) {
  const valor = new Date(data.replace(' ', 'T') + (data.includes('Z') ? '' : 'Z'))
  return Number.isNaN(valor.getTime())
    ? data
    : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(valor)
}

async function carregarErros() {
  carregandoErros.value = true
  erroErros.value = ''
  try {
    const resposta = respostaErrosSchema.safeParse(await $fetch<unknown>('/api/ocorrencias', {
      query: {
        ...(testeId.value ? { testeId: testeId.value } : codigoId.value ? { codigoId: codigoId.value } : {}),
        ordenar: 'recentes',
        pagina: paginaErros.value,
        limite: limiteErros,
      },
    }))
    if (!resposta.success) throw new Error('A lista de erros retornou dados inválidos.')
    dadosErros.value = resposta.data
  } catch (error: unknown) {
    erroErros.value = mensagemDeErro(error, 'Não foi possível carregar os erros desta carga.')
  } finally {
    carregandoErros.value = false
  }
}

onMounted(() => void carregarErros())
</script>

<template>
  <AppShell :title="tituloPagina" description="Acompanhe os erros registrados nas cargas e registre novas falhas.">
    <template #actions>
      <NuxtLink :to="destinoVoltar" class="interactive inline-flex min-h-10 items-center gap-2 rounded-control border border-border bg-surface px-3 text-xs font-semibold hover:bg-surface-raised sm:text-sm">
        <ArrowLeft :size="14" aria-hidden="true" /> Voltar
      </NuxtLink>
      <NuxtLink :to="{ path: '/ocorrencias/criar', query: route.query }" class="interactive inline-flex min-h-10 items-center gap-2 rounded-control bg-primary px-3.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover sm:text-sm">
        <Plus :size="15" aria-hidden="true" /> Criar erros
      </NuxtLink>
    </template>
    <div class="space-y-5">
<<<<<<< HEAD
      <div v-if="codigoId" class="flex gap-1 border-b border-border" role="tablist" aria-label="Telas da carga">
        <button
          type="button"
          role="tab"
          aria-controls="painel-visao-geral"
          :aria-selected="telaAtual === 'visao_geral'"
          class="interactive -mb-px inline-flex min-h-10 items-center gap-2 border-b-2 px-3 text-xs font-semibold"
          :class="telaAtual === 'visao_geral' ? 'border-primary text-primary' : 'border-transparent text-foreground-muted hover:text-foreground'"
          @click="telaAtual = 'visao_geral'"
        >
          <LayoutDashboard :size="15" aria-hidden="true" /> Visão geral
        </button>
        <button
          type="button"
          role="tab"
          aria-controls="painel-erros"
          :aria-selected="telaAtual === 'erros'"
          class="interactive -mb-px inline-flex min-h-10 items-center gap-2 border-b-2 px-3 text-xs font-semibold"
          :class="telaAtual === 'erros' ? 'border-primary text-primary' : 'border-transparent text-foreground-muted hover:text-foreground'"
          @click="telaAtual = 'erros'"
        >
          <MessageSquare :size="15" aria-hidden="true" /> Tela de erros
        </button>
      </div>

      <section
        v-if="codigoId && telaAtual === 'visao_geral'"
        id="painel-visao-geral"
        role="tabpanel"
        class="surface-card"
      >
        <LoadOverviewInline :codigo-id="codigoId" />
      </section>

      <section
        v-if="!codigoId || telaAtual === 'erros'"
        id="painel-erros"
        role="tabpanel"
        class="surface-card overflow-hidden"
      >
=======
      <div v-if="codigoId">
        <LoadOverviewPinnedItem :codigo-id="codigoId" />
        <h3 class="mt-5 mb-1 text-[10px] font-bold uppercase tracking-[0.13em] text-foreground-subtle">
          Erros · {{ dadosErros?.total ?? 0 }}
        </h3>
      </div>

      <section class="surface-card overflow-hidden">
>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3
        <div v-if="!codigoId" class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <div>
            <h2 class="text-sm font-bold">
              {{ tituloDsd ? `Erros da DSD: ${tituloDsd}` : testeId ? 'Erros registrados nesta carga' : 'Todos os erros' }}
            </h2>
            <p class="mt-1 text-[11px] text-foreground-muted">{{ dadosErros?.total ?? 0 }} registro(s)</p>
          </div>
          <UiButton variant="ghost" size="sm" :disabled="carregandoErros" @click="carregarErros">
            <template #icon><RefreshCw :size="13" :class="{ 'animate-spin': carregandoErros }" aria-hidden="true" /></template>
            Atualizar
          </UiButton>
        </div>
<<<<<<< HEAD
        <div v-else class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <div>
            <h2 class="text-sm font-bold">Erros · {{ dadosErros?.total ?? 0 }}</h2>
            <p class="mt-1 text-[11px] text-foreground-muted">Erros registrados nesta carga</p>
          </div>
=======
        <div v-else class="flex justify-end p-2 border-b border-border">
>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3
          <UiButton variant="ghost" size="sm" :disabled="carregandoErros" @click="carregarErros">
            <template #icon><RefreshCw :size="13" :class="{ 'animate-spin': carregandoErros }" aria-hidden="true" /></template>
            Atualizar
          </UiButton>
        </div>
        <AppAlert v-if="erroErros" tone="error" class="m-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <span>{{ erroErros }}</span>
            <UiButton variant="secondary" size="sm" @click="carregarErros">Tentar novamente</UiButton>
          </div>
        </AppAlert>
        <div v-else-if="carregandoErros" class="space-y-3 p-4">
          <UiSkeleton v-for="n in 4" :key="n" variant="block" />
        </div>
        <UiEmptyState
          v-else-if="!dadosErros?.ocorrencias.length"
          title="Nenhum erro registrado para esta carga"
          description="Os erros que forem informados nesta carga aparecerão aqui."
        />
        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[680px] text-left text-xs">
            <thead class="border-b border-border bg-surface-raised text-foreground-muted">
              <tr>
                <th scope="col" class="px-4 py-3 font-semibold sm:px-5">Tipo de Teste</th>
                <th scope="col" class="px-4 py-3 font-semibold sm:px-5">Erro</th>
                <th scope="col" class="px-4 py-3 font-semibold">Autor</th>
                <th scope="col" class="px-4 py-3 font-semibold">Status</th>
                <th scope="col" class="px-4 py-3 font-semibold">Criado em</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="item in dadosErros.ocorrencias" :key="item.id" class="hover:bg-surface-raised/60">
                <td class="px-4 py-3 text-foreground-muted sm:px-5">{{ item.tipo_teste || '—' }}</td>
                <td class="px-4 py-3">
                  <NuxtLink :to="destinoDetalhe(item.id)" class="font-semibold text-foreground hover:text-primary">
                    {{ item.titulo }}
                  </NuxtLink>
                </td>
                <td class="px-4 py-3 text-foreground-muted">{{ item.relator_nome }}</td>
                <td class="px-4 py-3"><OcorrenciaStatusBadge :status="item.status" /></td>
                <td class="whitespace-nowrap px-4 py-3 text-foreground-muted">{{ formatarData(item.criado_em) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <footer v-if="dadosErros && dadosErros.total_paginas > 1" class="flex items-center justify-between border-t border-border px-4 py-3">
          <span class="text-xs text-foreground-muted">Página {{ paginaErros }} de {{ dadosErros.total_paginas }}</span>
          <div class="flex gap-2">
            <UiButton variant="secondary" size="sm" :disabled="carregandoErros || paginaErros <= 1" aria-label="Página anterior" @click="paginaErros--; carregarErros()">
              <template #icon><ChevronLeft :size="14" aria-hidden="true" /></template>Anterior
            </UiButton>
            <UiButton variant="secondary" size="sm" :disabled="carregandoErros || paginaErros >= dadosErros.total_paginas" aria-label="Próxima página" @click="paginaErros++; carregarErros()">
              Próxima<template #icon><ChevronRight :size="14" aria-hidden="true" /></template>
            </UiButton>
          </div>
        </footer>
      </section>

    </div>
  </AppShell>
</template>
