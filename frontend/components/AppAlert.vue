<script setup lang="ts">
withDefaults(defineProps<{
  tone?: 'error' | 'success' | 'info'
}>(), {
  tone: 'info',
})

const tones = {
  error: 'border-danger/20 bg-danger-surface text-danger',
  success: 'border-success/20 bg-success-surface text-success',
  info: 'border-info/20 bg-info-surface text-info',
}
</script>

<template>
  <div role="alert" class="rounded-lg border px-4 py-3 text-sm" :class="tones[tone]">
    <slot />
  </div>
</template>
