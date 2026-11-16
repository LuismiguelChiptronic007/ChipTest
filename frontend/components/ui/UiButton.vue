<script setup lang="ts">
import { LoaderCircle } from '@lucide/vue'

withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}>(), {
  variant: 'secondary',
  size: 'md',
  loading: false,
  disabled: false,
  type: 'button',
})
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="interactive inline-flex shrink-0 items-center justify-center gap-2 rounded-control font-semibold disabled:pointer-events-none disabled:opacity-55"
    :class="{
      'min-h-8 px-3 text-xs': size === 'sm',
      'min-h-10 px-4 text-sm': size === 'md',
      'min-h-12 px-5 text-sm': size === 'lg',
      'bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover': variant === 'primary',
      'border border-border bg-surface text-foreground hover:border-border-strong hover:bg-surface-raised': variant === 'secondary',
      'bg-transparent text-foreground-muted hover:bg-surface-muted hover:text-foreground': variant === 'ghost',
      'bg-danger text-danger-foreground hover:opacity-90': variant === 'danger',
    }"
  >
    <LoaderCircle v-if="loading" :size="16" class="animate-spin" aria-hidden="true" />
    <slot name="icon" />
    <slot />
  </button>
</template>
