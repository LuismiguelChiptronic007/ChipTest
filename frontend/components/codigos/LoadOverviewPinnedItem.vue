<script setup lang="ts">
import { ArrowRight, Pin } from '@lucide/vue'

defineProps<{
  codigoId: string
}>()
</script>

<template>
  <NuxtLink
    :to="`/codigos/${codigoId}/visao-geral`"
    aria-label="Abrir informações da carga: dados da demanda, funções solicitadas, documentação e tabela de testes"
    class="interactive group flex min-h-[76px] items-center justify-between gap-4 rounded-card border border-primary/55 bg-info-surface px-4 py-3 transition-colors duration-150 hover:border-primary sm:px-5"
  >
    <span class="flex min-w-0 items-start gap-3">
      <Pin :size="17" class="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
      <span class="min-w-0">
        <span class="block text-sm font-bold text-foreground">Informações da carga</span>
        <span class="mt-1 block text-xs leading-5 text-foreground-muted">Dados da demanda, funções solicitadas, documentação e tabela de testes</span>
      </span>
    </span>
    <ArrowRight :size="17" class="shrink-0 text-foreground-subtle transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
  </NuxtLink>
</template>
