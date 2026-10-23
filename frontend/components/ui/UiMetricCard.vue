<script setup lang="ts">
import type { Component } from 'vue'

const props = withDefaults(defineProps<{
  title: string
  value: number
  detail: string
  icon: Component
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral'
}>(), {
  tone: 'primary',
})

const displayValue = ref(0)
let animationFrame = 0

watch(() => props.value, (value: number) => {
  cancelAnimationFrame(animationFrame)
  const motionReduced = import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (motionReduced || value === 0) {
    displayValue.value = value
    return
  }
  const startedAt = performance.now()
  const duration = 420
  const initialValue = displayValue.value
  const animate = (now: number) => {
    const progress = Math.min((now - startedAt) / duration, 1)
    const easedProgress = 1 - (1 - progress) ** 3
    displayValue.value = Math.round(initialValue + (value - initialValue) * easedProgress)
    if (progress < 1) animationFrame = requestAnimationFrame(animate)
  }
  animationFrame = requestAnimationFrame(animate)
}, { immediate: true })

onBeforeUnmount(() => cancelAnimationFrame(animationFrame))

const toneClasses = computed(() => ({
  primary: 'bg-info-surface text-info',
  success: 'bg-success-surface text-success',
  warning: 'bg-warning-surface text-warning',
  danger: 'bg-danger-surface text-danger',
  neutral: 'bg-surface-muted text-neutral',
})[props.tone])
</script>

<template>
  <UiCard padding="compact">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-xs font-medium text-foreground-muted">{{ title }}</p>
        <p class="mt-3 font-mono text-2xl font-semibold tracking-tight">{{ new Intl.NumberFormat('pt-BR').format(displayValue) }}</p>
      </div>
      <span class="grid h-9 w-9 shrink-0 place-items-center rounded-control" :class="toneClasses">
        <component :is="icon" :size="17" aria-hidden="true" />
      </span>
    </div>
    <p class="mt-3 border-t border-border pt-3 text-[11px] text-foreground-subtle">{{ detail }}</p>
  </UiCard>
</template>
