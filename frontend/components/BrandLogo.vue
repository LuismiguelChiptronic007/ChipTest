<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'symbol' | 'full'; size?: number }>(), {
  variant: 'full',
  size: 32,
})
</script>

<template>
  <span class="brand" :style="{ '--s': `${size}px`, '--color-primary': 'hsl(var(--primary))' }">
    <svg
      class="brand__mark"
      viewBox="0 0 64 64"
      :role="variant === 'symbol' ? 'img' : undefined"
      :aria-label="variant === 'symbol' ? 'Símbolo ChipTest' : undefined"
      :aria-hidden="variant === 'full' ? 'true' : undefined"
    >
      <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <path d="M49 10a28 28 0 1 0 0 44" stroke-width="4" />
        <path d="M44 17a19 19 0 1 0 0 30" stroke-width="4" />
        <path d="M38 24a9 9 0 1 0 0 16" stroke-width="4" />
        <path d="M38 24h7v-4h5m-12 8h13M38 40h7v4h5" stroke-width="2.5" />
      </g>
      <circle cx="53" cy="20" r="2.5" fill="currentColor" />
      <circle cx="53" cy="32" r="2.5" fill="currentColor" />
      <circle cx="53" cy="44" r="2.5" fill="currentColor" />
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
  color: inherit;
}
.brand__mark {
  width: var(--s);
  height: var(--s);
  flex: none;
  color: var(--color-primary);
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
}
.brand__by {
  margin-top: 2px;
  color: var(--color-primary);
  font-size: calc(var(--s) * 0.19);
  font-weight: 600;
  letter-spacing: 0.22em;
}
</style>
