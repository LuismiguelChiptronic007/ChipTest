<script setup lang="ts">
defineProps<{
  id: string
  tabs: Array<{ label: string; value: string }>
  modelValue: string
  ariaLabel: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function moveTab(event: KeyboardEvent, tabs: Array<{ label: string; value: string }>, value: string) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const currentIndex = tabs.findIndex(tab => tab.value === value)
  const nextIndex = event.key === 'Home'
    ? 0
    : event.key === 'End'
      ? tabs.length - 1
      : (currentIndex + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length
  emit('update:modelValue', tabs[nextIndex]!.value)
}
</script>

<template>
  <div class="flex gap-1 border-b border-border" role="tablist" :aria-label="ariaLabel">
    <button
      v-for="(tab, index) in tabs"
      :key="tab.value"
      :id="`${id}-tab-${index}`"
      :aria-controls="`${id}-panel-${index}`"
      type="button"
      role="tab"
      :aria-selected="modelValue === tab.value"
      :tabindex="modelValue === tab.value ? 0 : -1"
      class="interactive -mb-px border-b-2 px-3 py-2.5 text-xs font-semibold"
      :class="modelValue === tab.value ? 'border-primary text-primary' : 'border-transparent text-foreground-muted hover:text-foreground'"
      @click="emit('update:modelValue', tab.value)"
      @keydown="moveTab($event, tabs, tab.value)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>
