<script setup lang="ts">
const { initializeTheme } = useTheme()

onMounted(initializeTheme)
</script>

<template>
  <NuxtPage />
</template>
