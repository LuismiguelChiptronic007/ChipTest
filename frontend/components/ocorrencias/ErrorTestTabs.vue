<script setup lang="ts">
import type { ErrorTestKind } from '../../composables/useErrorTests'
import { nextTick } from 'vue'

const props = defineProps<{
  modelValue: ErrorTestKind
  counts: Record<ErrorTestKind, number>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ErrorTestKind]
}>()

const tabs: Array<{ value: ErrorTestKind; label: string }> = [
  { value: 'bancada', label: 'Bancada' },
  { value: 'campo', label: 'Campo' },
]

async function moverAba(event: KeyboardEvent) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const tablist = event.currentTarget instanceof HTMLElement ? event.currentTarget.parentElement : null
  const index = tabs.findIndex(tab => tab.value === props.modelValue)
  const next = event.key === 'Home'
    ? 0
    : event.key === 'End'
      ? tabs.length - 1
      : (index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length
  emit('update:modelValue', tabs[next]!.value)
  await nextTick()
  const buttons = tablist?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
  buttons?.[next]?.focus()
}
</script>

<template>
  <div class="flex border-b border-border" role="tablist" aria-label="Tipo de teste">
    <button
      v-for="tab in tabs"
      :key="tab.value"
      :id="`error-tests-tab-${tab.value}`"
      :aria-controls="`error-tests-panel-${tab.value}`"
      :aria-selected="modelValue === tab.value"
      :tabindex="modelValue === tab.value ? 0 : -1"
      class="interactive -mb-px flex min-h-11 flex-1 items-center justify-center gap-2 border-b-2 px-3 text-sm font-semibold transition-colors"
      :class="modelValue === tab.value ? 'border-primary text-primary' : 'border-transparent text-foreground-muted hover:text-foreground'"
      role="tab"
      type="button"
      @click="emit('update:modelValue', tab.value)"
      @keydown="moverAba"
    >
      {{ tab.label }}
      <span class="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] leading-none text-foreground-muted">{{ counts[tab.value] }}</span>
    </button>
  </div>
</template>
