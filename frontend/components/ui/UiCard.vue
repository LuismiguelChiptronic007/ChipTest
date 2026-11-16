<script setup lang="ts">
withDefaults(defineProps<{
  padding?: 'compact' | 'normal' | 'spacious'
  interactive?: boolean
}>(), {
  padding: 'normal',
  interactive: false,
})
</script>

<template>
  <section
    class="surface-card min-w-0"
    :class="{
      'p-4': padding === 'compact',
      'p-5 sm:p-6': padding === 'normal',
      'p-6 sm:p-8': padding === 'spacious',
      'interactive hover:-translate-y-0.5 hover:shadow-card': interactive,
    }"
  >
    <slot />
  </section>
</template>
