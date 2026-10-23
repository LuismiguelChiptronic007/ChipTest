<script setup lang="ts">
import { Moon, Sun } from '@lucide/vue'

withDefaults(defineProps<{
  compact?: boolean
}>(), {
  compact: false,
})

const { isDark, toggleTheme } = useTheme()
</script>

<template>
  <button
    type="button"
    class="interactive inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-border bg-surface text-sm font-medium text-foreground-muted hover:border-border-strong hover:bg-surface-raised hover:text-foreground"
    :class="compact ? 'h-10 w-10 px-0' : 'px-3'"
    :aria-label="isDark ? 'Ativar tema claro' : 'Ativar tema escuro'"
    :aria-pressed="isDark"
    @click="toggleTheme"
  >
    <Moon v-if="isDark" :size="16" aria-hidden="true" />
    <Sun v-else :size="16" aria-hidden="true" />
    <span v-if="!compact">{{ isDark ? 'Escuro' : 'Claro' }}</span>
  </button>
</template>
