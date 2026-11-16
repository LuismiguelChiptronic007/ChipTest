<script setup lang="ts">
import { ArrowLeft, Pencil, RefreshCw, Trash2 } from '@lucide/vue'
import type { LoadOverviewInput } from '../../composables/useLoadOverview'
import { useLoadOverview } from '../../composables/useLoadOverview'
import LoadOverviewNavigation from './LoadOverviewNavigation.vue'
import LoadDocsChecklist from './LoadDocsChecklist.vue'
import LoadFunctionImport from './LoadFunctionImport.vue'
import LoadOverviewForm from './LoadOverviewForm.vue'
import LoadTestsTable from './LoadTestsTable.vue'

const route = useRoute()
const router = useRouter()
const codigoId = computed(() => String(route.params.id))
const auth = useAuth()
const canEdit = computed(() => auth.can('codigos:gerenciar'))
const {
  data,
  loading,
  error,
  load,
  saveOverview,
  setDoc,
  removeOverview,
} = useLoadOverview(codigoId)

const editing = ref(false)
const saving = ref(false)
const importingFunctions = ref(false)
const importedFunctionsVersion = ref(0)
const docSaving = ref('')
const deleting = ref(false)
const aviso = ref('')
const overviewFormRef = ref<{ salvar: () => void } | null>(null)

function demandTypeLabel(value: string) {
  return value === 'nova_funcao' ? 'Nova Função' : 'Novo Sistema'
}

function demandStatusLabel(value: string) {
  return value === 'campo_sem_programador' ? 'Campo sem Programador' : 'Campo com Programador'
}

async function save(input: LoadOverviewInput) {
  saving.value = true
  error.value = ''
  try {
    await saveOverview(input)
  } catch (cause: unknown) {
    error.value = mensagemDeErro(cause, 'Não foi possível salvar a visão geral.')
  } finally {
    saving.value = false
  }
}

function salvarQuadro() {
  overviewFormRef.value?.salvar()
}

async function toggleDoc(key: string, checked: boolean) {
  docSaving.value = key
  error.value = ''
  try {
    await setDoc(key, checked)
  } catch (cause: unknown) {
    error.value = mensagemDeErro(cause, 'Não foi possível atualizar a documentação.')
    await load()
  } finally {
    docSaving.value = ''
  }
}

async function importarDocumento(file: File) {
  if (importingFunctions.value) return
  if (
    data.value?.functionImportRows.length
    && !window.confirm('Importar uma nova planilha substituirá os dados de funções já importados nesta DSD. Deseja continuar?')
  ) return
  importingFunctions.value = true
  error.value = ''
  aviso.value = ''
  try {
    const body = new FormData()
    body.set('file', file, file.name)
    const result = await $fetch<{ importedCount: number }>(
      `/api/codigos/${codigoId.value}/visao-geral/funcoes/importar`,
      { method: 'POST', body },
    )
    importedFunctionsVersion.value += 1
    await load()
    if (error.value) throw new Error(error.value)
    aviso.value = `Importação concluída: ${result.importedCount} funções carregadas.`
  } catch (cause: unknown) {
    error.value = mensagemDeErro(cause, 'Não foi possível importar a planilha de funções.')
  } finally {
    importingFunctions.value = false
  }
}

async function excluir() {
  if (!window.confirm('Excluir a visão geral, suas funções e os dados associados? A DSD e os erros não serão excluídos.')) return
  deleting.value = true
  error.value = ''
  try {
    await removeOverview()
    await router.push(`/codigos/${codigoId.value}?aba=ocorrencias`)
  } catch (cause: unknown) {
    error.value = mensagemDeErro(cause, 'Não foi possível excluir a visão geral.')
  } finally {
    deleting.value = false
  }
}

function formatDate(value: string | null) {
  if (!value) return 'XX/XX/20XX'
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pt-BR').format(date)
}
</script>

<template>
  <AppShell :title="data ? `${data.codigo.codigo} - ${data.codigo.modelo}` : 'Informações da carga'" description="Dados da demanda, funções solicitadas, documentação e tabela de testes.">
    <template #actions>
      <NuxtLink :to="`/codigos/${codigoId}?aba=ocorrencias`" class="interactive inline-flex min-h-9 items-center gap-2 rounded-control border border-border bg-surface px-3 text-xs font-semibold hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <ArrowLeft :size="14" aria-hidden="true" />Voltar à lista
      </NuxtLink>
      <template v-if="data && canEdit">
        <UiButton v-if="!editing" variant="secondary" size="sm" @click="editing = true"><template #icon><Pencil :size="14" aria-hidden="true" /></template>Editar</UiButton>
        <UiButton variant="danger" size="sm" :loading="deleting" @click="excluir"><template #icon><Trash2 :size="14" aria-hidden="true" /></template>Excluir</UiButton>
      </template>
    </template>

    <AppAlert v-if="error" tone="error" class="mb-4">
      <div class="flex flex-wrap items-center justify-between gap-3"><span>{{ error }}</span><UiButton variant="secondary" size="sm" @click="load"><template #icon><RefreshCw :size="14" aria-hidden="true" /></template>Tentar novamente</UiButton></div>
    </AppAlert>

    <div v-if="loading" class="space-y-4"><UiCard><UiSkeleton variant="heading" /><div class="mt-4"><UiSkeleton variant="block" /></div></UiCard><UiCard><UiSkeleton variant="block" /></UiCard></div>
    <template v-else-if="data">
      <LoadOverviewNavigation
        :codigo-id="codigoId"
        :active="2"
        class="mb-6"
      />

      <header class="mb-6 flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 class="text-xl font-bold tracking-tight sm:text-2xl">VISÃO GERAL - {{ data.codigo.codigo }} - {{ data.codigo.modelo }}</h1>
          <p class="mt-2 font-mono text-sm font-bold tracking-wide text-primary">SOLICITAÇÃO: {{ String(data.overview.request_number).padStart(2, '0') }}</p>
        </div>
      </header>

      <section class="surface-card p-4 sm:p-5" aria-labelledby="load-data-title">
        <h2 id="load-data-title" class="text-sm font-bold">Dados da demanda</h2>
        <div v-if="editing && canEdit" class="mt-4">
          <LoadOverviewForm
            ref="overviewFormRef"
            :overview="data.overview"
            :responsaveis="data.responsaveisDisponiveis"
            @save="save"
          />
        </div>
        <dl v-else class="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <div><dt class="text-[10px] font-bold uppercase tracking-wide text-foreground-subtle">Data</dt><dd class="mt-1 text-sm font-semibold">{{ formatDate(data.overview.launched_on) }}</dd></div>
          <div><dt class="text-[10px] font-bold uppercase tracking-wide text-foreground-subtle">Responsável lançamento</dt><dd class="mt-1 text-sm font-semibold">{{ data.overview.responsible_name || 'Responsável' }}</dd></div>
          <div><dt class="text-[10px] font-bold uppercase tracking-wide text-foreground-subtle">Tipo da demanda</dt><dd class="mt-1 text-sm font-semibold">{{ demandTypeLabel(data.overview.demand_type) }}</dd></div>
          <div><dt class="text-[10px] font-bold uppercase tracking-wide text-foreground-subtle">Status demanda</dt><dd class="mt-1 text-sm font-semibold">{{ demandStatusLabel(data.overview.demand_status) }}</dd></div>
          <div>
            <dt class="text-[10px] font-bold uppercase tracking-wide text-foreground-subtle">Print SGA</dt>
            <dd class="mt-1 text-sm font-semibold"><a v-if="data.overview.sga_print_url" :href="data.overview.sga_print_url" target="_blank" rel="noopener noreferrer" class="text-primary underline">FOTO</a><span v-else class="text-foreground-muted">FOTO</span></dd>
          </div>
          <div>
            <dt class="text-[10px] font-bold uppercase tracking-wide text-foreground-subtle">Informações do sistema</dt>
            <dd class="mt-1 text-sm font-semibold"><a v-if="data.overview.system_info_url" :href="data.overview.system_info_url" target="_blank" rel="noopener noreferrer" class="text-primary underline">FOTO</a><span v-else class="text-foreground-muted">FOTO</span></dd>
          </div>
        </dl>
        <p v-if="!editing && data.overview.notes" class="mt-5 whitespace-pre-wrap border-t border-border pt-4 text-sm leading-6 text-foreground-muted">{{ data.overview.notes }}</p>

        <div class="mt-6 border-t border-border pt-5">
          <div class="mb-3 flex items-center justify-between gap-3">
            <h3 class="text-sm font-bold">Funções solicitadas</h3>
            <span class="text-xs text-foreground-muted">{{ data.functionImportRows.length }} {{ data.functionImportRows.length === 1 ? 'função importada' : 'funções importadas' }}</span>
          </div>
          <AppAlert v-if="aviso" tone="success" class="mb-3">{{ aviso }}</AppAlert>
          <LoadFunctionImport
            :rows="data.functionImportRows"
            :can-edit="canEdit && editing"
            :importing="importingFunctions"
            :collapse-key="importedFunctionsVersion"
            @import-document="importarDocumento"
          />
        </div>
      </section>

      <section class="surface-card mt-4 p-4 sm:p-5" aria-labelledby="load-docs-title">
        <div class="mb-4"><h2 id="load-docs-title" class="text-sm font-bold">Documentação necessária presente</h2><p class="mt-1 text-xs text-foreground-muted">Marque os documentos recebidos; a atualização é salva imediatamente.</p></div>
        <LoadDocsChecklist :docs="data.docs" :disabled="!canEdit || !editing || Boolean(docSaving)" @toggle="toggleDoc" />
      </section>

      <section class="surface-card mt-4 p-4 sm:p-5" aria-labelledby="load-tests-title">
        <div class="mb-4"><h2 id="load-tests-title" class="text-sm font-bold">Tabela de testes realizados</h2><p class="mt-1 text-xs text-foreground-muted">Preencha os campos de cada coluna e clique em Salvar na linha do teste.</p></div>
        <LoadTestsTable
          :tests="data.tests"
          :ocorrencias="data.ocorrencias"
          :responsaveis="data.responsaveisDisponiveis"
          :can-edit="canEdit"
          :editing="editing"
          @saved="load"
        />
      </section>
      <div v-if="editing && canEdit" class="surface-card mt-4 flex justify-end gap-2 p-4">
        <UiButton variant="secondary" :disabled="saving" @click="editing = false">Cancelar</UiButton>
        <UiButton variant="primary" :loading="saving" @click="salvarQuadro">Salvar quadro</UiButton>
      </div>
    </template>
  </AppShell>
</template>
