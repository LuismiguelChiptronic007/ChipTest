<script setup lang="ts">
defineProps<{
  text: string
  id?: string
}>()
</script>

<template>
  <span class="group relative inline-flex">
    <slot />
    <span :id="id" role="tooltip" class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-control bg-foreground px-2.5 py-1.5 text-[10px] font-medium text-surface opacity-0 shadow-popover transition-opacity duration-interface group-hover:opacity-100 group-focus-within:opacity-100">{{ text }}</span>
  </span>
</template>
