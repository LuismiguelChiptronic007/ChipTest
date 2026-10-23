<script setup lang="ts">
import { Eye, EyeOff } from '@lucide/vue'

defineOptions({ inheritAttrs: false })

withDefaults(defineProps<{
  id: string
  label: string
  type?: string
  placeholder?: string
  hint?: string
  error?: string
  modelValue?: string
  revealable?: boolean
}>(), {
  revealable: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
const passwordVisible = ref(false)
</script>

<template>
  <div class="space-y-2">
    <label :for="id" class="block text-sm font-semibold text-foreground">{{ label }}</label>
    <div class="relative">
      <input
        :id="id"
        :value="modelValue"
        :type="revealable && passwordVisible ? 'text' : type || 'text'"
        :placeholder="placeholder"
        :aria-invalid="Boolean(error)"
        :aria-describedby="error ? `${id}-error` : hint ? `${id}-hint` : undefined"
        class="interactive min-h-10 w-full rounded-control border border-border bg-surface px-3.5 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
        :class="{ 'pr-11': revealable }"
        v-bind="$attrs"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      >
      <button
        v-if="revealable"
        type="button"
        class="absolute inset-y-0 right-0 grid w-11 place-items-center text-foreground-subtle hover:text-foreground"
        :aria-label="passwordVisible ? 'Ocultar senha' : 'Mostrar senha'"
        :aria-pressed="passwordVisible"
        :aria-controls="id"
        @click="passwordVisible = !passwordVisible"
      >
        <EyeOff v-if="passwordVisible" :size="16" aria-hidden="true" />
        <Eye v-else :size="16" aria-hidden="true" />
      </button>
    </div>
    <p v-if="error" :id="`${id}-error`" class="text-xs font-medium text-danger">{{ error }}</p>
    <p v-else-if="hint" :id="`${id}-hint`" class="text-xs text-foreground-muted">{{ hint }}</p>
  </div>
</template>
