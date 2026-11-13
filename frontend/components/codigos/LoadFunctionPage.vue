<script setup lang="ts">
import { ArrowLeft, ExternalLink, Pencil, Save, Trash2 } from '@lucide/vue'
import type { LoadFunction } from '../../composables/useLoadFunctions'
import {
  categoryTitle,
  functionSlug,
  loadFunctionCategories,
  useLoadFunctions,
} from '../../composables/useLoadFunctions'
import LoadFunctionRows from './LoadFunctionRows.vue'
import LoadOverviewNavigation from './LoadOverviewNavigation.vue'

const route = useRoute()
const codigoId = computed(() => String(route.params.id))
const auth = useAuth()
const canEdit = computed(() => auth.can('codigos:gerenciar'))
const {
  data,
  loading,
  error,
  categoryNames,
  activeFunction,
  selectedSlug,
  selectFunction,
  updateFunction,
  removeFunction,
  saveRows,
} = useLoadFunctions(codigoId)
const editing = ref(false)
const saving = ref(false)
const title = ref('')
const printUrl = ref('')

const categories = loadFunctionCategories

watch(activeFunction, (func: LoadFunction | null) => {
  title.value = func?.title ?? ''
  printUrl.value = func?.print_url ?? ''
}, { immediate: true })

async function saveFunction() {
  if (!activeFunction.value) return
  saving.value = true
  error.value = ''
  try {
    await updateFunction(activeFunction.value.id, {
      title: title.value.trim(),
      printUrl: printUrl.value.trim() || null,
    })
  } catch (cause: unknown) {
    error.value = mensagemDeErro(cause, 'Não foi possível salvar os dados da função.')
  } finally {
    saving.value = false
  }
}

async function saveFunctionRows(rows: Array<{ item: string; description: string; value: string }>) {
  if (!activeFunction.value) return
  saving.value = true
  error.value = ''
  try {
    await saveRows(activeFunction.value.id, rows)
  } catch (cause: unknown) {
    error.value = mensagemDeErro(cause, 'Não foi possível salvar as informações da central.')
  } finally {
    saving.value = false
  }
}

async function deleteFunction() {
  if (!activeFunction.value || !window.confirm(`Excluir a função “${activeFunction.value.title}” e suas informações?`)) return
  const previous = data.value?.functions.filter((func: LoadFunction) => func.id !== activeFunction.value?.id) ?? []
  saving.value = true
  error.value = ''
  try {
    await removeFunction(activeFunction.value.id)
    const next = previous[0]
    if (next) await selectFunction(functionSlug(next.category, next.sequence))
    else await navigateTo(`/codigos/${codigoId.value}/visao-geral`)
  } catch (cause: unknown) {
    error.value = mensagemDeErro(cause, 'Não foi possível excluir a função.')
  } finally {
    saving.value = false
  }
}

</script>

<template>
  <AppShell :title="data ? `${data.codigo.codigo} - ${data.codigo.modelo}` : 'Função solicitada'" description="Informações da central solicitadas para esta função.">
    <template #actions>
      <NuxtLink :to="`/codigos/${codigoId}/visao-geral`" class="interactive inline-flex min-h-9 items-center gap-2 rounded-control border border-border bg-surface px-3 text-xs font-semibold hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <ArrowLeft :size="14" aria-hidden="true" />Voltar à visão geral
      </NuxtLink>
      <a v-if="activeFunction?.print_url" :href="activeFunction.print_url" target="_blank" rel="noopener noreferrer" class="interactive inline-flex min-h-9 items-center gap-2 rounded-control border border-border bg-surface px-3 text-xs font-semibold hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <ExternalLink :size="14" aria-hidden="true" />Ver print original
      </a>
      <UiButton v-if="canEdit && activeFunction && !editing" variant="secondary" size="sm" @click="editing = true"><template #icon><Pencil :size="14" aria-hidden="true" /></template>Editar</UiButton>
      <UiButton v-if="canEdit && editing" variant="secondary" size="sm" @click="deleteFunction"><template #icon><Trash2 :size="14" aria-hidden="true" /></template>Excluir função</UiButton>
    </template>

    <AppAlert v-if="error" tone="error" class="mb-4">{{ error }}</AppAlert>

    <div v-if="data" class="mb-6">
      <LoadOverviewNavigation
        :codigo-id="codigoId"
        :active="3"
        :first-function-slug="data.functions[0] ? functionSlug(data.functions[0].category, data.functions[0].sequence) : undefined"
      />
    </div>

    <div v-if="loading" class="grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)]"><UiCard><UiSkeleton variant="block" /></UiCard><UiCard><UiSkeleton variant="block" /></UiCard></div>
    <div v-else-if="data" class="grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside class="surface-card h-fit p-3">
        <label for="load-function-select" class="sr-only">Selecionar função</label>
        <select
          id="load-function-select"
          :value="selectedSlug"
          class="interactive min-h-10 w-full rounded-control border border-border bg-surface px-3 text-sm font-semibold lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          @change="selectFunction(($event.target as HTMLSelectElement).value)"
        >
          <optgroup v-for="category in categories" :key="category" :label="categoryNames[category]">
            <option v-for="func in data.functions.filter(item => item.category === category)" :key="func.id" :value="functionSlug(func.category, func.sequence)">
              {{ categoryTitle(func) }}
            </option>
          </optgroup>
        </select>
        <nav class="hidden space-y-4 lg:block" aria-label="Funções da DSD">
          <section v-for="category in categories" :key="category" v-show="data.functions.some(func => func.category === category)">
            <h2 class="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-foreground-subtle">{{ categoryNames[category] }}</h2>
            <ul class="mt-1 space-y-1">
              <li v-for="func in data.functions.filter(item => item.category === category)" :key="func.id">
                <button
                  type="button"
                  class="interactive min-h-9 w-full rounded-control px-2.5 text-left text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  :class="selectedSlug === functionSlug(func.category, func.sequence) ? 'bg-primary/10 text-primary' : 'text-foreground-muted hover:bg-surface-raised hover:text-foreground'"
                  :aria-current="selectedSlug === functionSlug(func.category, func.sequence) ? 'page' : undefined"
                  @click="selectFunction(functionSlug(func.category, func.sequence))"
                >{{ categoryTitle(func) }}</button>
              </li>
            </ul>
          </section>
          <p v-if="!data.functions.length" class="px-2 py-4 text-xs text-foreground-muted">Nenhuma função cadastrada nesta DSD.</p>
        </nav>
      </aside>

      <main class="min-w-0">
        <div class="mb-4">
          <p class="text-[10px] font-semibold uppercase tracking-wide text-foreground-subtle">{{ data.codigo.codigo }} · {{ data.codigo.modelo }} <span aria-hidden="true">›</span> Funções solicitadas</p>
          <h1 v-if="activeFunction && !editing" class="mt-2 text-xl font-bold">{{ categoryTitle(activeFunction) }}</h1>
          <div v-else-if="activeFunction" class="mt-3 grid gap-3 sm:grid-cols-2">
            <UiField id="load-function-title" v-model="title" label="Título da função" maxlength="180" />
            <UiField id="load-function-print" v-model="printUrl" type="url" label="Print original (URL)" placeholder="https://" />
            <div class="sm:col-span-2 flex justify-end">
              <UiButton variant="primary" size="sm" :loading="saving" @click="saveFunction"><template #icon><Save :size="14" aria-hidden="true" /></template>Salvar função</UiButton>
            </div>
          </div>
        </div>

        <section v-if="activeFunction" class="surface-card p-4 sm:p-5">
          <div class="mb-4 border-b border-border pb-3">
            <h2 class="text-sm font-bold uppercase tracking-wide">Informações da central</h2>
            <p class="mt-1 text-xs text-foreground-muted">Itens, descrições e valores técnicos desta tela.</p>
          </div>
          <LoadFunctionRows :rows="activeFunction.rows" :editing="editing && canEdit" :saving="saving" @save="saveFunctionRows" />
        </section>
        <UiEmptyState v-else title="Nenhuma função cadastrada" description="Adicione uma função na visão geral da carga para preencher suas informações." />
      </main>
    </div>
  </AppShell>
</template>
