<script setup lang="ts">
import { AlertTriangle, CheckCircle2, Clock3, MinusCircle } from '@lucide/vue'
import type { Component } from 'vue'
import UiBadge from '../ui/UiBadge.vue'

const props = defineProps<{
  status: 'aberta' | 'em_analise' | 'resolvida' | 'descartada'
}>()

const config: Record<typeof props.status, { label: string; tone: 'danger' | 'warning' | 'success' | 'neutral'; icon: Component }> = {
  aberta: { label: 'Erro', tone: 'danger', icon: AlertTriangle },
  em_analise: { label: 'Analisar', tone: 'warning', icon: Clock3 },
  resolvida: { label: 'Concluída', tone: 'success', icon: CheckCircle2 },
  descartada: { label: 'Descartada', tone: 'neutral', icon: MinusCircle },
}
</script>

<template>
  <UiBadge :tone="config[status].tone">
    <component :is="config[status].icon" :size="13" aria-hidden="true" />
    {{ config[status].label }}
  </UiBadge>
</template>
