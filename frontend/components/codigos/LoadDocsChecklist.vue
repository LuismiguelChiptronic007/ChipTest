<script setup lang="ts">
import { Check } from '@lucide/vue'

const props = defineProps<{
  docs: Array<{ key: string; checked: boolean | number }>
  disabled?: boolean
}>()

const emit = defineEmits<{
  toggle: [key: string, checked: boolean]
}>()

const items = [
  { key: 'simulacao', label: 'Simulação' },
  { key: 'interpretacao', label: 'Interpretação' },
  { key: 'codigo_falhas', label: 'Código de falhas' },
  { key: 'rg_dsd_12', label: 'RG-DSD-12' },
]

function checked(key: string) {
  return Boolean(props.docs.find(doc => doc.key === key)?.checked)
}
</script>

<template>
  <ul class="grid gap-2 sm:grid-cols-2">
    <li v-for="item in items" :key="item.key">
      <label class="interactive flex min-h-11 items-center gap-3 rounded-control border border-border bg-surface px-3 text-sm transition-colors hover:border-primary/50 focus-within:ring-2 focus-within:ring-primary/50">
        <input
          type="checkbox"
          class="h-4 w-4 accent-primary"
          :checked="checked(item.key)"
          :disabled="disabled"
          @change="emit('toggle', item.key, ($event.target as HTMLInputElement).checked)"
        >
        <span class="flex-1" :class="checked(item.key) ? 'text-foreground-subtle line-through' : 'text-foreground'">{{ item.label }}</span>
        <Check v-if="checked(item.key)" :size="15" class="text-success" aria-hidden="true" />
      </label>
    </li>
  </ul>
</template>
