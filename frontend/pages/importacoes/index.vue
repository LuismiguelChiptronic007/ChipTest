<script setup lang="ts">
import { Download, FileText, RefreshCw, Upload } from '@lucide/vue'
import { z } from 'zod'
import { resumoImportacaoSchema } from '@backend/schemas/importacoes'

const auth = useAuth()
const carregando = ref(true)
const erro = ref('')
const importacoes = ref<Array<{
  id: string
  codigo_id: string
  codigo: string
  marca: string
  modelo: string
  nome_arquivo: string
  usuario_nome: string | null
  resumo: z.infer<typeof resumoImportacaoSchema>
  status: 'concluida' | 'falhou'
  criado_em: string
}>>([])

const respostaSchema = z.object({
  importacoes: z.array(z.object({
    id: z.string().uuid(),
    codigo_id: z.string().uuid(),
    codigo: z.string(),
    marca: z.string(),
    modelo: z.string(),
    nome_arquivo: z.string(),
    usuario_nome: z.string().nullable(),
    resumo: resumoImportacaoSchema,
    status: z.enum(['concluida', 'falhou']),
    criado_em: z.string(),
  })),
})

const podeImportar = computed(() => auth.can('secoes:gerenciar'))

function mensagemErro(error: unknown) {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = error.data
    if (typeof data === 'object' && data !== null && 'statusMessage' in data && typeof data.statusMessage === 'string') return data.statusMessage
  }
  return error instanceof Error ? error.message : 'Não foi possível carregar as importações.'
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
    const resposta = respostaSchema.safeParse(await $fetch<unknown>('/api/importacoes'))
    if (!resposta.success) throw new Error('A lista de importações retornou dados inválidos.')
    importacoes.value = resposta.data.importacoes
  } catch (error: unknown) {
    erro.value = mensagemErro(error)
  } finally {
    carregando.value = false
  }
}

onMounted(() => void carregar())
</script>

<template>
  <AppShell title="Importações" description="Documentos Word originais e histórico dos itens técnicos carregados nos códigos.">
    <template #actions>
      <NuxtLink v-if="podeImportar" to="/importacoes/nova" class="interactive inline-flex min-h-10 items-center gap-2 rounded-control bg-primary px-3.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover sm:px-4 sm:text-sm">
        <Upload :size="15" aria-hidden="true" /> Importar Word
      </NuxtLink>
    </template>

    <div v-if="erro" class="mb-4">
      <AppAlert tone="error">
        <div class="flex flex-wrap items-center justify-between gap-3"><span>{{ erro }}</span><UiButton variant="secondary" size="sm" @click="carregar"><template #icon><RefreshCw :size="14" aria-hidden="true" /></template>Tentar novamente</UiButton></div>
      </AppAlert>
    </div>

    <section class="surface-card overflow-hidden">
      <div class="flex items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
        <div><h2 class="text-sm font-bold">Histórico de importação</h2><p class="mt-1 text-xs text-foreground-muted">Até 100 documentos mais recentes.</p></div>
        <UiButton variant="secondary" size="sm" :loading="carregando" aria-label="Atualizar importações" @click="carregar"><template #icon><RefreshCw :size="14" aria-hidden="true" /></template><span class="hidden sm:inline">Atualizar</span></UiButton>
      </div>
      <div v-if="carregando" class="space-y-3 p-4 sm:p-5" aria-label="Carregando importações">
        <UiSkeleton v-for="item in 5" :key="item" variant="block" />
      </div>
      <div v-else-if="!erro && !importacoes.length" class="p-6 sm:p-10">
        <UiEmptyState title="Nenhum documento importado" description="Quando um documento técnico for carregado, ele e o resumo das seções aparecerão nesta lista." :icon="FileText">
          <template v-if="podeImportar" #action>
            <NuxtLink to="/importacoes/nova" class="interactive inline-flex min-h-9 items-center gap-2 rounded-control bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary-hover"><Upload :size="14" aria-hidden="true" /> Importar primeiro documento</NuxtLink>
          </template>
        </UiEmptyState>
      </div>
      <div v-else-if="importacoes.length" class="overflow-x-auto">
        <table class="w-full min-w-[760px] text-left text-xs">
          <thead class="sticky top-0 bg-surface-raised text-[10px] uppercase tracking-wide text-foreground-subtle">
            <tr><th class="px-4 py-3 font-bold sm:px-5">Data / usuário</th><th class="px-4 py-3 font-bold">Documento</th><th class="px-4 py-3 font-bold">Código</th><th class="px-4 py-3 font-bold">Resumo</th><th class="px-4 py-3 font-bold">Original</th></tr>
          </thead>
          <tbody>
            <tr v-for="item in importacoes" :key="item.id" class="border-t border-border hover:bg-surface-raised/60">
              <td class="px-4 py-3.5 sm:px-5"><p class="font-semibold">{{ formatarData(item.criado_em) }}</p><p class="mt-1 text-[11px] text-foreground-muted">{{ item.usuario_nome || 'Usuário removido' }}</p></td>
              <td class="max-w-[240px] px-4 py-3.5"><p class="truncate font-medium" :title="item.nome_arquivo">{{ item.nome_arquivo }}</p><UiBadge class="mt-1" :tone="item.status === 'concluida' ? 'success' : 'danger'">{{ item.status === 'concluida' ? 'Concluída' : 'Falhou' }}</UiBadge></td>
              <td class="px-4 py-3.5">
                <NuxtLink :to="`/codigos/${item.codigo_id}`" class="font-mono font-bold text-primary hover:underline">{{ item.codigo }}</NuxtLink>
                <p class="mt-1 text-[11px] text-foreground-muted">{{ item.marca }} {{ item.modelo }}</p>
              </td>
              <td class="px-4 py-3.5 text-foreground-muted">
                <template v-if="item.resumo.legado">
                  <p>Importação anterior à lista de itens</p>
                  <p class="mt-1">Documento original preservado</p>
                </template>
                <template v-else>
                  <p>{{ item.resumo.novos.length }} novos · {{ item.resumo.removidos.length }} desativados</p>
                  <p class="mt-1">{{ item.resumo.inalterados.length }} inalterados · {{ item.resumo.ignoradas.length }} seções ignoradas</p>
                </template>
              </td>
              <td class="px-4 py-3.5">
                <a :href="`/api/importacoes/${item.id}/arquivo`" class="interactive inline-flex min-h-8 items-center gap-1.5 rounded-control border border-border bg-surface px-2.5 font-semibold hover:bg-surface-raised" :download="item.nome_arquivo">
                  <Download :size="13" aria-hidden="true" /> Baixar
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </AppShell>
</template>
