<script setup lang="ts">
import { Pencil, RefreshCw } from '@lucide/vue'
import { useLoadOverview } from '../../composables/useLoadOverview'
import type { LoadOverviewInput } from '../../composables/useLoadOverview'
import LoadDocsChecklist from './LoadDocsChecklist.vue'
import LoadFunctionImport from './LoadFunctionImport.vue'
import LoadOverviewForm from './LoadOverviewForm.vue'
import LoadTestsTable from './LoadTestsTable.vue'

const props = defineProps<{
  codigoId: string
}>()

const auth = useAuth()
const canEdit = computed(() => auth.can('codigos:gerenciar'))
const editing = ref(false)
const saving = ref(false)
const saveError = ref('')
const savingDoc = ref('')
const actionError = ref('')
const actionSuccess = ref('')
const importingFunctions = ref(false)
const importedFunctionsVersion = ref(0)
const overviewFormRef = ref<{ salvar: () => void } | null>(null)
const { data, loading, error, load, saveOverview, setDoc } = useLoadOverview(() => props.codigoId)

async function save(input: LoadOverviewInput) {
  saving.value = true
  saveError.value = ''
  try {
    await saveOverview(input)
  } catch (cause: unknown) {
    saveError.value = mensagemDeErro(cause, 'Não foi possível salvar a visão geral.')
  } finally {
    saving.value = false
  }
}

function salvarQuadro() {
  overviewFormRef.value?.salvar()
}

async function toggleDoc(key: string, checked: boolean) {
  savingDoc.value = key
  actionError.value = ''
  try {
    await setDoc(key, checked)
  } catch (cause: unknown) {
    actionError.value = mensagemDeErro(cause, 'Não foi possível atualizar a documentação.')
    await load()
  } finally {
    savingDoc.value = ''
  }
}

async function importarDocumento(file: File) {
  if (importingFunctions.value) return
  if (
    data.value?.functionImportRows.length
    && !window.confirm('Importar uma nova planilha substituirá os dados de funções já importados nesta DSD. Deseja continuar?')
  ) return
  importingFunctions.value = true
  actionError.value = ''
  actionSuccess.value = ''
  try {
    const body = new FormData()
    body.set('file', file, file.name)
    const result = await $fetch<{ importedCount: number }>(
      `/api/codigos/${props.codigoId}/visao-geral/funcoes/importar`,
      { method: 'POST', body },
    )
    importedFunctionsVersion.value += 1
    await load()
    if (error.value) throw new Error(error.value)
    actionSuccess.value = `Importação concluída: ${result.importedCount} funções carregadas.`
  } catch (cause: unknown) {
    actionError.value = mensagemDeErro(cause, 'Não foi possível importar a planilha de funções.')
  } finally {
    importingFunctions.value = false
  }
}

function demandTypeLabel(value: string) {
  return value === 'nova_funcao' ? 'Nova Função' : 'Novo Sistema'
}

function demandStatusLabel(value: string) {
  return value === 'campo_sem_programador' ? 'Campo sem Programador' : 'Campo com Programador'
}

function formatDate(value: string | null) {
  if (!value) return 'Não informado'
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pt-BR').format(date)
}
</script>

<template>
  <section class="surface-card p-4 sm:p-5" aria-labelledby="load-overview-inline-title">
    <div v-if="loading" class="space-y-3">
      <UiSkeleton variant="heading" />
      <UiSkeleton variant="block" />
      <UiSkeleton variant="block" />
    </div>
    <AppAlert v-else-if="error" tone="error">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <span>{{ error }}</span>
        <UiButton variant="secondary" size="sm" @click="load">
          <template #icon><RefreshCw :size="13" aria-hidden="true" /></template>
          Tentar novamente
        </UiButton>
      </div>
    </AppAlert>
    <template v-else-if="data">
      <header class="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 id="load-overview-inline-title" class="text-base font-bold tracking-tight sm:text-lg">
            VISÃO GERAL · {{ data.codigo.codigo }}<template v-if="data.codigo.modelo"> · {{ data.codigo.modelo }}</template>
          </h2>
          <p class="mt-2 font-mono text-xs font-bold tracking-wide text-primary">
            SOLICITAÇÃO: {{ String(data.overview.request_number).padStart(2, '0') }}
          </p>
        </div>
        <UiButton v-if="canEdit && !editing" variant="secondary" size="sm" @click="editing = true">
          <template #icon><Pencil :size="14" aria-hidden="true" /></template>
          Editar
        </UiButton>
      </header>

      <section class="mt-4" aria-labelledby="load-demand-inline-title">
        <h3 id="load-demand-inline-title" class="text-sm font-bold">Resultado real · Dados da demanda</h3>
        <AppAlert v-if="saveError" tone="error" class="mt-4">{{ saveError }}</AppAlert>
        <div v-if="editing && canEdit" class="mt-4">
          <LoadOverviewForm
            ref="overviewFormRef"
            :overview="data.overview"
            :responsaveis="data.responsaveisDisponiveis"
            @save="save"
          />
        </div>
        <template v-else>
          <dl class="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <div><dt class="text-[10px] font-bold uppercase tracking-wide text-foreground-subtle">Data</dt><dd class="mt-1 text-sm font-semibold">{{ formatDate(data.overview.launched_on) }}</dd></div>
            <div><dt class="text-[10px] font-bold uppercase tracking-wide text-foreground-subtle">Responsável lançamento</dt><dd class="mt-1 text-sm font-semibold">{{ data.overview.responsible_name || 'Não informado' }}</dd></div>
            <div><dt class="text-[10px] font-bold uppercase tracking-wide text-foreground-subtle">Tipo da demanda</dt><dd class="mt-1 text-sm font-semibold">{{ demandTypeLabel(data.overview.demand_type) }}</dd></div>
            <div><dt class="text-[10px] font-bold uppercase tracking-wide text-foreground-subtle">Status demanda</dt><dd class="mt-1 text-sm font-semibold">{{ demandStatusLabel(data.overview.demand_status) }}</dd></div>
          </dl>

          <div class="mt-5 grid gap-4 sm:grid-cols-2">
            <figure class="rounded-control border border-border p-3">
              <figcaption class="mb-2 text-xs font-semibold">Print SGA</figcaption>
              <a v-if="data.overview.sga_print_url" :href="data.overview.sga_print_url" target="_blank" rel="noopener noreferrer" class="block">
                <img :src="data.overview.sga_print_url" alt="Print SGA da carga" loading="lazy" referrerpolicy="no-referrer" class="max-h-64 w-full rounded-control border border-border bg-surface object-contain">
              </a>
              <p v-else class="text-xs text-foreground-muted">Não informado</p>
            </figure>
            <figure class="rounded-control border border-border p-3">
              <figcaption class="mb-2 text-xs font-semibold">Informações do sistema</figcaption>
              <a v-if="data.overview.system_info_url" :href="data.overview.system_info_url" target="_blank" rel="noopener noreferrer" class="block">
                <img :src="data.overview.system_info_url" alt="Informações do sistema" loading="lazy" referrerpolicy="no-referrer" class="max-h-64 w-full rounded-control border border-border bg-surface object-contain">
              </a>
              <p v-else class="text-xs text-foreground-muted">Não informado</p>
            </figure>
          </div>

          <p v-if="data.overview.notes" class="mt-4 whitespace-pre-wrap border-t border-border pt-4 text-sm leading-6 text-foreground-muted">{{ data.overview.notes }}</p>
        </template>
      </section>

      <AppAlert v-if="actionError" tone="error" class="mt-5">{{ actionError }}</AppAlert>
      <AppAlert v-if="actionSuccess" tone="success" class="mt-5">{{ actionSuccess }}</AppAlert>

      <section class="mt-5 border-t border-border pt-5" aria-labelledby="load-functions-inline-title">
        <div class="mb-3 flex items-center justify-between gap-3">
          <h3 id="load-functions-inline-title" class="text-sm font-bold">Funções solicitadas</h3>
          <span class="text-xs text-foreground-muted">{{ data.functionImportRows.length }} {{ data.functionImportRows.length === 1 ? 'função importada' : 'funções importadas' }}</span>
        </div>
        <LoadFunctionImport
          :rows="data.functionImportRows"
          :can-edit="canEdit && editing"
          :importing="importingFunctions"
          :collapse-key="importedFunctionsVersion"
          @import-document="importarDocumento"
        />
      </section>

      <section class="mt-5 border-t border-border pt-5" aria-labelledby="load-docs-inline-title">
        <h3 id="load-docs-inline-title" class="text-sm font-bold">Documentação necessária presente</h3>
        <p class="mb-3 mt-1 text-xs text-foreground-muted">As marcações são salvas automaticamente.</p>
        <LoadDocsChecklist :docs="data.docs" :disabled="!canEdit || !editing || Boolean(savingDoc)" @toggle="toggleDoc" />
      </section>

      <section class="mt-5 border-t border-border pt-5" aria-labelledby="load-tests-inline-title">
        <h3 id="load-tests-inline-title" class="text-sm font-bold">Tabela de testes realizados</h3>
        <p class="mb-3 mt-1 text-xs text-foreground-muted">Preencha os campos de cada coluna e clique em Salvar na linha do teste.</p>
        <LoadTestsTable
          :tests="data.tests"
          :ocorrencias="data.ocorrencias"
          :responsaveis="data.responsaveisDisponiveis"
          :can-edit="canEdit"
          :editing="editing"
          @saved="load"
        />
      </section>
      <div v-if="editing && canEdit" class="mt-4 flex justify-end gap-2 border-t border-border pt-4">
        <UiButton variant="secondary" :disabled="saving" @click="editing = false">Cancelar</UiButton>
        <UiButton variant="primary" :loading="saving" @click="salvarQuadro">Salvar quadro</UiButton>
      </div>
    </template>
  </section>
</template>
