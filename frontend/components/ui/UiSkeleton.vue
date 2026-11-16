<script setup lang="ts">
withDefaults(defineProps<{
  count?: number
  variant?: 'line' | 'heading' | 'avatar' | 'block'
}>(), {
  count: 1,
  variant: 'line',
})
</script>

<template>
  <div class="space-y-2" aria-hidden="true">
    <div
      v-for="index in count"
      :key="index"
      class="animate-pulse rounded bg-surface-muted"
      :class="{
        'h-3 w-2/5': variant === 'line',
        'h-5 w-1/2': variant === 'heading',
        'h-9 w-9 rounded-full': variant === 'avatar',
        'h-20 w-full rounded-control': variant === 'block',
      }"
    />
  </div>
</template>
