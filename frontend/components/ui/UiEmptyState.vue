<script setup lang="ts">
import { HardDrive } from '@lucide/vue'
import type { Component } from 'vue'

withDefaults(defineProps<{
  title: string
  description: string
  icon?: Component
}>(), {
  icon: () => HardDrive,
})
</script>

<template>
  <div class="flex min-h-36 flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface-raised px-4 py-5 text-center">
    <span class="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-foreground-muted">
      <component :is="icon" :size="17" aria-hidden="true" />
    </span>
    <p class="mt-3 text-xs font-semibold">{{ title }}</p>
    <p class="mt-1 max-w-[230px] text-[11px] leading-relaxed text-foreground-muted">{{ description }}</p>
    <div v-if="$slots.action" class="mt-3"><slot name="action" /></div>
  </div>
</template>
