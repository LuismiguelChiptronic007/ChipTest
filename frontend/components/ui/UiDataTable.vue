<template>
  <div>
    <div class="space-y-2 md:hidden"><slot name="mobile" /></div>
    <div class="ds-table -mx-2 hidden max-h-[480px] overflow-auto px-2 md:block">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.ds-table :deep(table) {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  text-align: left;
}

.ds-table :deep(thead) {
  position: sticky;
  top: 0;
  z-index: 1;
  background: hsl(var(--surface-raised));
}

.ds-table :deep(tbody tr) {
  transition: background-color 180ms ease;
}

.ds-table :deep(tbody tr:hover) {
  background: hsl(var(--surface-raised));
}

@media (prefers-reduced-motion: reduce) {
  .ds-table :deep(tbody tr) {
    transition: none;
  }
}
</style>
