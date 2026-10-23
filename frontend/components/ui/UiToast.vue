<script setup lang="ts">
import { CheckCircle2, Info, X, XCircle } from '@lucide/vue'

const props = withDefaults(defineProps<{
  modelValue: boolean
  title: string
  description: string
  tone?: 'success' | 'danger' | 'info'
  duration?: number
}>(), {
  tone: 'success',
  duration: 3200,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

let timer: ReturnType<typeof setTimeout> | undefined

function close() {
  emit('update:modelValue', false)
}

watch(() => props.modelValue, (visible: boolean) => {
  if (timer) clearTimeout(timer)
  if (visible && props.duration > 0) timer = setTimeout(close, props.duration)
}, { immediate: true })

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="toast">
      <div v-if="modelValue" role="status" aria-live="polite" class="surface-popover fixed bottom-5 right-5 z-50 flex max-w-sm items-center gap-3 p-3.5">
        <span class="grid h-8 w-8 shrink-0 place-items-center rounded-full" :class="tone === 'success' ? 'bg-success-surface text-success' : tone === 'danger' ? 'bg-danger-surface text-danger' : 'bg-info-surface text-info'">
          <CheckCircle2 v-if="tone === 'success'" :size="17" aria-hidden="true" />
          <XCircle v-else-if="tone === 'danger'" :size="17" aria-hidden="true" />
          <Info v-else :size="17" aria-hidden="true" />
        </span>
        <div class="min-w-0"><p class="text-xs font-semibold">{{ title }}</p><p class="mt-0.5 text-[11px] text-foreground-muted">{{ description }}</p></div>
        <button type="button" aria-label="Fechar notificação" class="ml-2 rounded p-1 text-foreground-subtle hover:bg-surface-muted" @click="close"><X :size="15" aria-hidden="true" /></button>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
