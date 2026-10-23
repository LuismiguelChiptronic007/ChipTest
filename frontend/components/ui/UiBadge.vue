<script setup lang="ts">
withDefaults(defineProps<{
  tone?: 'success' | 'danger' | 'warning' | 'neutral' | 'info'
  dot?: boolean
}>(), {
  tone: 'neutral',
  dot: false,
})
</script>

<template>
  <span
    class="inline-flex min-h-6 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold leading-none"
    :class="{
      'bg-success-surface text-success': tone === 'success',
      'bg-danger-surface text-danger': tone === 'danger',
      'bg-warning-surface text-warning': tone === 'warning',
      'bg-neutral-surface text-neutral': tone === 'neutral',
      'bg-info-surface text-info': tone === 'info',
    }"
  >
    <span v-if="dot" class="h-1.5 w-1.5 rounded-full" :class="tone === 'neutral' ? 'bg-neutral-mark' : 'bg-current'" aria-hidden="true" />
    <slot />
  </span>
</template>
