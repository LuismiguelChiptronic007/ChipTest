<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'symbol' | 'full'; size?: number; tone?: 'default' | 'inverse' }>(), {
  variant: 'full',
  size: 32,
  tone: 'default',
})
</script>

<template>
  <span
    class="brand"
    :style="{
      '--s': size + 'px',
      '--color-primary': 'hsl(var(--primary))',
      '--color-text': tone === 'inverse' ? 'hsl(var(--auth-foreground))' : 'hsl(var(--foreground))',
      '--color-text-muted': tone === 'inverse' ? 'hsl(var(--auth-muted))' : 'hsl(var(--foreground-muted))',
    }"
    aria-label="ChipTest"
  >
    <svg class="brand__mark" viewBox="0 0 64 64" aria-hidden="true">
      <g fill="none" stroke="currentColor" stroke-linecap="round">
        <path d="M47.6 16.4 A22 22 0 1 0 47.6 47.6" stroke-width="6" />
        <path d="M32 32 H46" stroke-width="5" />
      </g>
      <circle cx="53" cy="32" r="5" fill="currentColor" />
    </svg>
    <span v-if="variant === 'full'" class="brand__text">
      <span class="brand__name">ChipTest</span>
      <span class="brand__by">CHIPTRONIC</span>
    </span>
  </span>
</template>

<style scoped>
.brand {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--s) * 0.3);
  color: var(--color-primary);
}
.brand__mark {
  width: var(--s);
  height: var(--s);
  flex: none;
}
.brand__text {
  display: flex;
  flex-direction: column;
  line-height: 1.05;
}
.brand__name {
  font-size: calc(var(--s) * 0.5);
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--color-text);
}
.brand__by {
  font-size: calc(var(--s) * 0.19);
  font-weight: 500;
  letter-spacing: 0.22em;
  color: var(--color-text-muted);
}
</style>
