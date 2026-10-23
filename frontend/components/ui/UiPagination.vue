<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue'

defineProps<{
  page: number
  totalPages: number
  totalItems: number
  pageSize: number
}>()

const emit = defineEmits<{
  'update:page': [page: number]
}>()
</script>

<template>
  <nav class="flex items-center justify-between gap-3 border-t border-border pt-4" aria-label="Paginação">
    <p class="text-xs text-foreground-muted">
      Mostrando <strong class="text-foreground">{{ totalItems ? (page - 1) * pageSize + 1 : 0 }}–{{ Math.min(page * pageSize, totalItems) }}</strong>
      de <strong class="text-foreground">{{ totalItems }}</strong> itens
    </p>
    <div class="flex items-center gap-1">
      <button type="button" class="grid h-8 w-8 place-items-center rounded-control border border-border text-foreground-muted hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-45" aria-label="Página anterior" :disabled="page <= 1" @click="emit('update:page', page - 1)"><ChevronLeft :size="16" /></button>
      <span class="grid h-8 min-w-8 place-items-center rounded-control bg-primary px-2 text-xs font-semibold text-primary-foreground" aria-current="page">{{ page }}</span>
      <button type="button" class="grid h-8 w-8 place-items-center rounded-control border border-border text-foreground-muted hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-45" aria-label="Próxima página" :disabled="page >= totalPages" @click="emit('update:page', page + 1)"><ChevronRight :size="16" /></button>
    </div>
  </nav>
</template>
