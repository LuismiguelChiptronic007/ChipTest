<script setup lang="ts">
<<<<<<< HEAD
withDefaults(defineProps<{ variant?: 'symbol' | 'full'; size?: number }>(), {
  variant: 'full',
  size: 32,
=======
withDefaults(defineProps<{ variant?: 'symbol' | 'full'; size?: number; tone?: 'default' | 'inverse' }>(), {
  variant: 'full',
  size: 32,
  tone: 'default',
>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3
})
</script>

<template>
<<<<<<< HEAD
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
=======
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
>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3
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
<<<<<<< HEAD
  color: inherit;
=======
  color: var(--color-primary);
>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3
}
.brand__mark {
  width: var(--s);
  height: var(--s);
  flex: none;
<<<<<<< HEAD
  color: var(--color-primary);
=======
>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3
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
<<<<<<< HEAD
}
.brand__by {
  margin-top: 2px;
  color: var(--color-primary);
  font-size: calc(var(--s) * 0.19);
  font-weight: 600;
  letter-spacing: 0.22em;
=======
  color: var(--color-text);
}
.brand__by {
  font-size: calc(var(--s) * 0.19);
  font-weight: 500;
  letter-spacing: 0.22em;
  color: var(--color-text-muted);
>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3
}
</style>
