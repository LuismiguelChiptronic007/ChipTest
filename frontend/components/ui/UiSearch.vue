<script setup lang="ts">
import { Search, X } from '@lucide/vue'

withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
  label?: string
  shortcut?: string
}>(), {
  modelValue: '',
  placeholder: 'Buscar...',
  label: 'Buscar',
  shortcut: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <label class="interactive flex min-h-10 min-w-0 items-center gap-2 rounded-control border border-border bg-surface px-3 text-sm text-foreground-subtle focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
    <Search :size="16" class="shrink-0" aria-hidden="true" />
    <input
      :value="modelValue"
      class="w-full bg-transparent text-foreground outline-none placeholder:text-foreground-subtle"
      :placeholder="placeholder"
      :aria-label="label"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    >
    <button
      v-if="modelValue"
      type="button"
      class="rounded p-0.5 text-foreground-subtle hover:bg-surface-muted hover:text-foreground"
      :aria-label="`Limpar ${label.toLowerCase()}`"
      @click="emit('update:modelValue', '')"
    ><X :size="14" aria-hidden="true" /></button>
    <kbd v-else-if="shortcut" class="hidden shrink-0 rounded border border-border bg-surface-raised px-1.5 py-0.5 font-mono text-[10px] sm:inline">{{ shortcut }}</kbd>
  </label>
</template>
