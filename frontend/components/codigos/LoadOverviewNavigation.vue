<script setup lang="ts">
const props = defineProps<{
  codigoId: string
  active: 1 | 2 | 3
  firstFunctionSlug?: string
}>()
</script>

<template>
  <nav class="flex flex-wrap items-center gap-2" aria-label="Navegação da carga">
    <NuxtLink
      :to="`/codigos/${codigoId}?aba=ocorrencias`"
      class="interactive inline-flex min-h-9 items-center rounded-full border border-border bg-surface px-4 text-xs font-semibold text-foreground-muted hover:border-border-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      :class="{ 'border-primary/50 bg-info-surface/60 text-primary hover:border-primary': active === 1 }"
    >
      1 · Lista de erros da DSD
    </NuxtLink>

    <NuxtLink
      :to="`/codigos/${codigoId}/visao-geral`"
      class="interactive inline-flex min-h-9 items-center rounded-full border border-border bg-surface px-4 text-xs font-semibold text-foreground-muted hover:border-border-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      :class="{ 'border-primary/50 bg-info-surface/60 text-primary hover:border-primary': active === 2 }"
    >
      2 · Visão geral
    </NuxtLink>

    <NuxtLink
      v-if="firstFunctionSlug"
      :to="{ path: `/codigos/${codigoId}/funcao`, query: { funcao: firstFunctionSlug } }"
      class="interactive inline-flex min-h-9 items-center rounded-full border border-border bg-surface px-4 text-xs font-semibold text-foreground-muted hover:border-border-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      :class="{ 'border-primary/50 bg-info-surface/60 text-primary hover:border-primary': active === 3 }"
    >
      3 · Tela da função
    </NuxtLink>
    <span
      v-else
      class="inline-flex min-h-9 cursor-not-allowed items-center rounded-full border border-border bg-surface/50 px-4 text-xs font-semibold text-foreground-subtle opacity-50"
    >
      3 · Tela da função
    </span>
  </nav>
</template>
