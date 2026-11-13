<script setup lang="ts">
import { Activity, ArrowUpRight, Settings, SlidersHorizontal, ToggleLeft } from '@lucide/vue'
import type { LoadFunctionCategory } from '../../composables/useLoadOverview'
import { firstFunctionInCategory, functionSlug } from '../../composables/useLoadFunctions'

type FunctionCard = {
  id: string
  category: LoadFunctionCategory
  sequence: number
  title: string
  print_url: string | null
}

const props = defineProps<{
  codigoId: string
  functions: FunctionCard[]
  canEdit: boolean
  adding?: boolean
}>()

const emit = defineEmits<{
  add: [category: LoadFunctionCategory]
}>()

const categories: Array<{
  id: LoadFunctionCategory
  name: string
  icon: typeof Settings
}> = [
  { id: 'basico', name: 'Básico', icon: Settings },
  { id: 'sensores', name: 'Sensores', icon: Activity },
  { id: 'estados', name: 'Estados', icon: ToggleLeft },
  { id: 'parametrizacoes', name: 'Parametrizações', icon: SlidersHorizontal },
]

const totals = computed(() => Object.fromEntries(
  categories.map(category => [category.id, props.functions.filter(item => item.category === category.id).length]),
) as Record<LoadFunctionCategory, number>)

function slugForCategory(category: LoadFunctionCategory) {
  const func = firstFunctionInCategory(props.functions, category)
  return func ? functionSlug(func.category, func.sequence) : ''
}
</script>

<template>
  <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <template v-for="category in categories" :key="category.id">
      <NuxtLink
        v-if="totals[category.id] > 0"
        :key="category.id"
        :to="{ path: `/codigos/${codigoId}/funcao`, query: { funcao: slugForCategory(category.id) } }"
        :aria-label="`Abrir categoria ${category.name}, ${totals[category.id]} ${totals[category.id] === 1 ? 'tela' : 'telas'}`"
        class="interactive group min-h-28 rounded-card border border-border bg-surface p-4 transition-colors duration-150 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div class="flex items-center justify-between gap-3">
          <component :is="category.icon" :size="19" class="text-primary" aria-hidden="true" />
          <ArrowUpRight :size="15" class="text-foreground-subtle group-hover:text-primary" aria-hidden="true" />
        </div>
        <p class="mt-4 text-sm font-bold">{{ category.name }}</p>
        <p class="mt-1 text-xs text-foreground-muted">{{ totals[category.id] }} {{ totals[category.id] === 1 ? 'tela' : 'telas' }}</p>
      </NuxtLink>

      <button
        v-if="canEdit && totals[category.id] === 0"
        :key="`${category.id}-add`"
        type="button"
        class="interactive flex min-h-28 flex-col items-start justify-center rounded-card border border-dashed border-border bg-surface p-4 text-left transition-colors duration-150 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        :disabled="adding"
        @click="emit('add', category.id)"
      >
        <component :is="category.icon" :size="19" class="text-primary" aria-hidden="true" />
        <span class="mt-3 text-sm font-bold">Adicionar {{ category.name }}</span>
        <span class="mt-1 text-xs text-foreground-muted">Criar a primeira tela</span>
      </button>
    </template>
  </div>
  <div v-if="canEdit" class="mt-3 flex flex-wrap gap-2">
    <button
      v-for="category in categories.filter(item => totals[item.id] > 0)"
      :key="`${category.id}-additional`"
      type="button"
      class="interactive inline-flex min-h-8 items-center gap-1.5 rounded-control border border-border bg-surface px-2.5 text-[11px] font-semibold text-foreground-muted transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      :disabled="adding"
      @click="emit('add', category.id)"
    >
      <component :is="category.icon" :size="13" aria-hidden="true" />Adicionar tela em {{ category.name }}
    </button>
  </div>
</template>
