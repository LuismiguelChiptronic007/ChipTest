<script setup lang="ts">
import { ChevronDown } from '@lucide/vue'

defineOptions({ inheritAttrs: false })

withDefaults(defineProps<{
  id: string
  label: string
  options: Array<{ label: string; value: string }>
  modelValue?: string
  hint?: string
  error?: string
}>(), {
  error: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="space-y-2">
    <label :for="id" class="block text-sm font-semibold text-foreground">{{ label }}</label>
    <div class="relative">
      <select
        :id="id"
        :value="modelValue"
        :aria-invalid="Boolean(error)"
        :aria-describedby="error ? `${id}-error` : hint ? `${id}-hint` : undefined"
        class="interactive min-h-10 w-full appearance-none rounded-control border border-border bg-surface px-3.5 pr-9 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
        v-bind="$attrs"
        @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option>
      </select>
      <ChevronDown :size="15" class="pointer-events-none absolute right-3 top-3 text-foreground-subtle" aria-hidden="true" />
    </div>
    <p v-if="error" :id="`${id}-error`" class="text-xs font-medium text-danger">{{ error }}</p>
    <p v-else-if="hint" :id="`${id}-hint`" class="text-xs text-foreground-muted">{{ hint }}</p>
  </div>
</template>
