<script setup lang="ts">
import { X } from '@lucide/vue'

const props = withDefaults(defineProps<{
  modelValue: boolean
  title: string
  description?: string
  variant?: 'modal' | 'drawer'
  initialFocus?: string
}>(), {
  variant: 'modal',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const closeButton = ref<HTMLButtonElement>()
const dialogElement = ref<HTMLElement>()
const titleId = useId()
let previouslyFocused: HTMLElement | null = null

function close() {
  emit('update:modelValue', false)
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    close()
  }

  if (event.key !== 'Tab') return
  const dialog = event.currentTarget as HTMLElement
  const focusable = [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')]
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (!first || !last) return
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(() => props.modelValue, async (visible: boolean) => {
  if (!visible) {
    await nextTick()
    previouslyFocused?.focus()
    previouslyFocused = null
    return
  }
  previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
  await nextTick()
  const initialFocus = props.initialFocus
    ? dialogElement.value?.querySelector<HTMLElement>(props.initialFocus)
    : undefined
  const focusTarget = initialFocus || closeButton.value
  focusTarget?.focus()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="overlay">
      <div v-if="modelValue" class="fixed inset-0 z-40 bg-foreground/35" @click.self="close">
        <section
          role="dialog"
          aria-modal="true"
          ref="dialogElement"
          :aria-labelledby="titleId"
          :aria-describedby="description ? `${titleId}-description` : undefined"
          class="surface-popover"
          :class="variant === 'drawer' ? 'ml-auto flex h-full w-full max-w-sm flex-col rounded-none p-5' : 'mx-auto mt-[10vh] w-full max-w-md p-5 sm:p-6'"
          @keydown="handleKeydown"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 :id="titleId" class="text-base font-bold tracking-tight">{{ title }}</h2>
              <p v-if="description" :id="`${titleId}-description`" class="mt-1.5 text-sm leading-relaxed text-foreground-muted">{{ description }}</p>
            </div>
            <button ref="closeButton" type="button" :aria-label="variant === 'drawer' ? 'Fechar painel lateral' : 'Fechar janela'" class="shrink-0 rounded-control p-1.5 text-foreground-subtle hover:bg-surface-muted" @click="close"><X :size="17" aria-hidden="true" /></button>
          </div>
          <div class="mt-5" :class="variant === 'drawer' ? 'flex-1' : ''"><slot /></div>
          <div v-if="$slots.footer" class="mt-6 flex justify-end gap-2"><slot name="footer" /></div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}

.overlay-enter-from section,
.overlay-leave-to section {
  transform: translateY(8px);
}
</style>
