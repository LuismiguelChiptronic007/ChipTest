<script setup lang="ts">
const route = useRoute()
</script>

<template>
  <CodigosCodigoForm :codigo-id="String(route.params.id)" />
</template>
