<script setup lang="ts">
import { Activity, AlertTriangle, Cpu, FileText, LayoutDashboard, Users } from '@lucide/vue'
import type { Component } from 'vue'

const emit = defineEmits<{
  navigate: []
}>()

const auth = useAuthStore()
const route = useRoute()

const groups = computed(() => {
  const sections: Array<{
    label: string
    items: Array<{ label: string; icon: Component; to?: string; available: boolean }>
  }> = [
    { label: 'Painel', items: [{ label: 'Visão geral', icon: LayoutDashboard, to: '/painel', available: true }] },
    { label: 'Códigos', items: [{ label: 'Códigos de veículos', icon: Cpu, to: '/codigos', available: true }] },
    { label: 'Testes', items: [{ label: 'Execução de testes', icon: Activity, available: false }] },
    { label: 'Ocorrências', items: [{ label: 'Ocorrências', icon: AlertTriangle, available: false }] },
    { label: 'Importações', items: [{ label: 'Importar documento Word', icon: FileText, available: false }] },
  ]

  if (auth.perfil?.papel === 'admin' && auth.perfil.ativo) {
    sections.push({
      label: 'Administração',
      items: [{ label: 'Usuários', icon: Users, to: '/admin/usuarios', available: true }],
    })
  }

  return sections
})
</script>

<template>
  <nav aria-label="Navegação principal" class="space-y-5">
    <section v-for="group in groups" :key="group.label">
      <h2 class="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-foreground-subtle">{{ group.label }}</h2>
      <ul class="space-y-1">
        <li v-for="item in group.items" :key="item.label">
          <NuxtLink
            v-if="item.available && item.to"
            :to="item.to"
            class="interactive flex min-h-10 items-center gap-3 rounded-control px-3 text-[13px] font-medium"
            :class="route.path === item.to || (item.to === '/codigos' && route.path.startsWith('/codigos')) ? 'bg-info-surface text-info' : 'text-foreground-muted hover:bg-surface-raised hover:text-foreground'"
            :aria-current="route.path === item.to || (item.to === '/codigos' && route.path.startsWith('/codigos')) ? 'page' : undefined"
            @click="emit('navigate')"
          >
            <component :is="item.icon" :size="17" aria-hidden="true" />
            <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
          </NuxtLink>
          <div v-else class="flex min-h-10 items-center gap-3 rounded-control px-3 text-[13px] font-medium text-foreground-subtle" :title="`${item.label} estará disponível em uma próxima fase`">
            <component :is="item.icon" :size="17" aria-hidden="true" />
            <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
            <span class="rounded-full bg-surface-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide">Em breve</span>
          </div>
        </li>
      </ul>
    </section>
  </nav>
</template>
