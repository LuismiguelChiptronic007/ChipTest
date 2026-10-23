<script setup lang="ts">
import { Check } from '@lucide/vue'

defineProps<{
  steps: string[]
  currentStep: number
  ariaLabel?: string
}>()
</script>

<template>
  <ol class="flex items-center" :aria-label="ariaLabel || 'Etapas'">
    <li v-for="(step, index) in steps" :key="step" class="contents">
      <div class="flex items-center gap-2">
        <span
          class="grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[11px] font-bold"
          :class="index + 1 < currentStep ? 'border-success bg-success text-surface' : index + 1 === currentStep ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-surface text-foreground-subtle'"
          :aria-current="index + 1 === currentStep ? 'step' : undefined"
        >
          <Check v-if="index + 1 < currentStep" :size="14" aria-hidden="true" />
          <template v-else>{{ index + 1 }}</template>
        </span>
        <span class="hidden text-xs font-medium sm:inline" :class="index + 1 === currentStep ? 'text-foreground' : 'text-foreground-subtle'">{{ step }}</span>
      </div>
      <span v-if="index < steps.length - 1" class="mx-3 h-px flex-1 bg-border" aria-hidden="true" />
    </li>
  </ol>
</template>
