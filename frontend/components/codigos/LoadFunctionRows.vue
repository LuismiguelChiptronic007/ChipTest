<script setup lang="ts">
import { ArrowDown, ArrowUp, Plus, Trash2 } from '@lucide/vue'
import type { LoadFunctionRows } from '../../composables/useLoadOverview'

const props = defineProps<{
  rows: LoadFunctionRows
  editing: boolean
  saving?: boolean
}>()

const emit = defineEmits<{
  save: [rows: LoadFunctionRows]
}>()

const draft = ref<LoadFunctionRows>([])
watch(() => props.rows, (rows: LoadFunctionRows) => {
  draft.value = rows.map((row: LoadFunctionRows[number]) => ({ ...row }))
}, { immediate: true, deep: true })

function move(index: number, offset: number) {
  const target = index + offset
  if (target < 0 || target >= draft.value.length) return
  const next = [...draft.value]
  const [row] = next.splice(index, 1)
  next.splice(target, 0, row!)
  draft.value = next
}

function add() {
  draft.value.push({ item: '', description: '', value: '' })
}

function remove(index: number) {
  draft.value.splice(index, 1)
}
</script>

<template>
  <div class="overflow-x-auto rounded-card border border-border">
    <table class="w-full min-w-[680px] text-left text-sm">
      <thead class="bg-surface-raised text-[10px] uppercase tracking-wide text-foreground-subtle">
        <tr><th class="px-3 py-3 font-bold">Item</th><th class="px-3 py-3 font-bold">Descrição</th><th class="px-3 py-3 font-bold">Valor</th><th v-if="editing" class="px-3 py-3"><span class="sr-only">Ações</span></th></tr>
      </thead>
      <tbody class="divide-y divide-border">
        <tr v-for="(row, index) in draft" :key="index">
          <td class="px-3 py-2.5">
            <input v-if="editing" v-model="row.item" :aria-label="`Item da linha ${index + 1}`" class="interactive min-h-9 w-full rounded-control border border-border bg-surface px-2 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15">
            <span v-else>{{ row.item || '-' }}</span>
          </td>
          <td class="px-3 py-2.5">
            <textarea v-if="editing" v-model="row.description" rows="2" :aria-label="`Descrição da linha ${index + 1}`" class="interactive min-h-9 w-full rounded-control border border-border bg-surface px-2 py-2 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" />
            <span v-else class="whitespace-pre-wrap">{{ row.description || '-' }}</span>
          </td>
          <td class="px-3 py-2.5">
            <textarea v-if="editing" v-model="row.value" rows="2" :aria-label="`Valor da linha ${index + 1}`" class="interactive min-h-9 w-full rounded-control border border-border bg-surface px-2 py-2 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" />
            <span v-else class="whitespace-pre-wrap">{{ row.value || '-' }}</span>
          </td>
          <td v-if="editing" class="whitespace-nowrap px-3 py-2.5">
            <div class="flex gap-1">
              <button type="button" class="interactive rounded-control p-1.5 text-foreground-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" :aria-label="`Mover linha ${index + 1} para cima`" :disabled="index === 0" @click="move(index, -1)"><ArrowUp :size="14" aria-hidden="true" /></button>
              <button type="button" class="interactive rounded-control p-1.5 text-foreground-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" :aria-label="`Mover linha ${index + 1} para baixo`" :disabled="index === draft.length - 1" @click="move(index, 1)"><ArrowDown :size="14" aria-hidden="true" /></button>
              <button type="button" class="interactive rounded-control p-1.5 text-danger hover:bg-danger-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" :aria-label="`Remover linha ${index + 1}`" @click="remove(index)"><Trash2 :size="14" aria-hidden="true" /></button>
            </div>
          </td>
        </tr>
        <tr v-if="!draft.length">
          <td :colspan="editing ? 4 : 3" class="px-3 py-8 text-center text-xs text-foreground-muted">Nenhuma informação da central cadastrada.</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div v-if="editing" class="mt-3 flex flex-wrap justify-between gap-2">
    <UiButton variant="secondary" size="sm" :disabled="saving" @click="add"><template #icon><Plus :size="14" aria-hidden="true" /></template>Adicionar linha</UiButton>
    <UiButton variant="primary" size="sm" :loading="saving" @click="emit('save', draft.map((row: LoadFunctionRows[number]) => ({ ...row })))">Salvar linhas</UiButton>
  </div>
</template>
