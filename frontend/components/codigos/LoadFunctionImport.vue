<script setup lang="ts">
import { ChevronDown, FileText, Upload } from '@lucide/vue'
import type { LoadFunctionImportCategory } from '../../composables/useLoadOverview'

type ImportedFunctionRow = {
  id: string
  category: LoadFunctionImportCategory
  position: number
  version_ontime: string
  function_type: string
  function_dieseldiag: string
  equipment_base: string
  developed: string
}

const props = defineProps<{
  rows: ImportedFunctionRow[]
  canEdit: boolean
  importing?: boolean
  collapseKey: number
}>()

const emit = defineEmits<{
  importDocument: [file: File]
}>()

const categories: Array<{ id: LoadFunctionImportCategory; name: string }> = [
  { id: 'basico', name: 'Básico' },
  { id: 'sensores', name: 'Sensores' },
  { id: 'estados', name: 'Estados' },
  { id: 'atuadores', name: 'Atuadores' },
  { id: 'ajustes', name: 'Ajustes' },
  { id: 'parametrizacoes', name: 'Parametrizações' },
  { id: 'funcao_avancada', name: 'Função avançada' },
]

const collapsedCategories = ref(new Set<LoadFunctionImportCategory>())

watch(() => props.collapseKey, (key: number) => {
  if (key > 0) {
    collapsedCategories.value = new Set(categories.map(category => category.id))
  }
}, { immediate: true })

const rowsByCategory = computed(() => Object.fromEntries(
  categories.map(category => [
    category.id,
    props.rows.filter(row => row.category === category.id).sort((a, b) => a.position - b.position),
  ]),
) as Record<LoadFunctionImportCategory, ImportedFunctionRow[]>)

function alternarCategoria(category: LoadFunctionImportCategory) {
  const updated = new Set(collapsedCategories.value)
  if (updated.has(category)) updated.delete(category)
  else updated.add(category)
  collapsedCategories.value = updated
}

function selecionarArquivo(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) emit('importDocument', file)
  input.value = ''
}
</script>

<template>
  <div class="space-y-4">
    <div v-if="canEdit" class="flex flex-wrap items-center justify-between gap-3 rounded-control border border-border bg-surface-raised p-3">
      <div class="flex items-start gap-2">
        <FileText :size="16" class="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <p class="text-xs font-semibold">Importar planilha de funções</p>
          <p class="mt-1 max-w-2xl text-[11px] leading-5 text-foreground-muted">
            Envie um arquivo .xlsx ou .xlsm com as cinco colunas da planilha de referência.
            O arquivo original não será guardado; somente os dados dessas colunas serão importados.
          </p>
        </div>
      </div>
      <label
        class="interactive inline-flex min-h-9 items-center gap-2 rounded-control bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary-hover"
        :class="importing ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'"
      >
        <input
          type="file"
          accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.macroEnabled.12"
          class="sr-only"
          :disabled="importing"
          @change="selecionarArquivo"
        >
        <Upload :size="14" aria-hidden="true" :class="{ 'animate-pulse': importing }" />
        {{ importing ? 'Importando...' : 'Selecionar planilha' }}
      </label>
    </div>

    <template v-if="rows.length">
      <section
        v-for="category in categories.filter(item => rowsByCategory[item.id].length)"
        :key="category.id"
        class="overflow-hidden rounded-card border border-border bg-surface"
      >
        <button
          type="button"
          class="interactive flex w-full items-center justify-between gap-3 bg-surface-raised px-3 py-2.5 text-left hover:bg-surface-raised/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
          :aria-expanded="!collapsedCategories.has(category.id)"
          :aria-label="`${collapsedCategories.has(category.id) ? 'Maximizar' : 'Minimizar'} quadro ${category.name}`"
          @click="alternarCategoria(category.id)"
        >
          <span class="text-xs font-bold">{{ category.name }}</span>
          <span class="flex items-center gap-2">
            <span class="text-[11px] text-foreground-muted">
              {{ rowsByCategory[category.id].length }}
              {{ rowsByCategory[category.id].length === 1 ? 'função' : 'funções' }}
            </span>
            <ChevronDown
              :size="14"
              class="text-foreground-subtle transition-transform duration-150"
              :class="{ 'rotate-180': !collapsedCategories.has(category.id) }"
              aria-hidden="true"
            />
          </span>
        </button>
        <div v-if="!collapsedCategories.has(category.id)" class="overflow-x-auto">
          <table class="w-full min-w-[760px] border-collapse text-left text-xs">
            <thead>
              <tr class="bg-surface-raised text-[10px] font-bold uppercase tracking-wide text-foreground-muted">
                <th scope="col" class="border-b border-r border-border px-3 py-2">Versão_ONTIME</th>
                <th scope="col" class="border-b border-r border-border px-3 py-2">Tipo da Função</th>
                <th scope="col" class="border-b border-r border-border px-3 py-2">Função Dieseldiag</th>
                <th scope="col" class="border-b border-r border-border px-3 py-2">Equipamento Base</th>
                <th scope="col" class="border-b border-border px-3 py-2">Desenvolvido</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rowsByCategory[category.id]" :key="row.id" class="hover:bg-surface-raised/60">
                <td class="border-b border-r border-border px-3 py-2">{{ row.version_ontime || '—' }}</td>
                <td class="border-b border-r border-border px-3 py-2">{{ row.function_type || '—' }}</td>
                <td class="border-b border-r border-border px-3 py-2">{{ row.function_dieseldiag || '—' }}</td>
                <td class="border-b border-r border-border px-3 py-2">{{ row.equipment_base || '—' }}</td>
                <td class="border-b border-border px-3 py-2">{{ row.developed || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
    <p v-else class="rounded-control border border-dashed border-border p-5 text-center text-xs text-foreground-muted">
      Nenhuma planilha de funções importada para esta DSD.
    </p>
  </div>
</template>
