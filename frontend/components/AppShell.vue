<script setup lang="ts">
import { ChevronRight, Cpu, LogOut, Search, ShieldCheck } from '@lucide/vue'

const props = defineProps<{
  title: string
  description: string
}>()

const auth = useAuthStore()
const route = useRoute()
const mobileNavigationOpen = ref(false)
const globalSearchOpen = ref(false)
const globalSearchQuery = ref('')
const userMenuOpen = ref(false)
const loggingOut = ref(false)
const logoutError = ref('')
const userMenuButton = ref<HTMLButtonElement>()
const userMenuPanel = ref<HTMLDivElement>()

const initials = computed(() => {
  const name = auth.perfil?.nome.trim()
  if (!name) return 'CT'
  return name.split(/\s+/).slice(0, 2).map((part: string) => part[0]).join('').toLocaleUpperCase('pt-BR')
})

const searchItems = computed(() => {
  const items = [
    { label: 'Visão geral', detail: 'Painel ChipTest', to: '/painel', icon: Cpu },
    { label: 'Códigos de veículos', detail: 'Catálogo e cadastro de veículos', to: '/codigos', icon: Cpu },
    { label: 'Meu perfil', detail: 'Dados da conta e senha', to: '/perfil', icon: ShieldCheck },
  ]
  if (auth.perfil?.papel === 'admin' && auth.perfil.ativo) {
    items.push({ label: 'Usuários', detail: 'Administração de acessos', to: '/admin/usuarios', icon: ShieldCheck })
  }
  const query = globalSearchQuery.value.trim().toLocaleLowerCase('pt-BR')
  return query
    ? items.filter(item => `${item.label} ${item.detail}`.toLocaleLowerCase('pt-BR').includes(query))
    : items
})

function handleGlobalKeydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === 'k') {
    event.preventDefault()
    globalSearchOpen.value = true
  }
  if (event.key === 'Escape' && userMenuOpen.value) {
    userMenuOpen.value = false
    userMenuButton.value?.focus()
  }
}

function closeUserMenuOutside(event: PointerEvent) {
  const target = event.target
  if (
    userMenuOpen.value
    && target instanceof Node
    && !userMenuButton.value?.contains(target)
    && !userMenuPanel.value?.contains(target)
  ) {
    userMenuOpen.value = false
  }
}

async function sair() {
  logoutError.value = ''
  loggingOut.value = true
  try {
    await $fetch('/api/auth/sessao', { method: 'DELETE' })
    auth.limpar()
    await navigateTo('/login')
  } catch (error: unknown) {
    logoutError.value = mensagemDeErro(error, 'Não foi possível encerrar a sessão. Tente novamente.')
    userMenuOpen.value = false
  } finally {
    loggingOut.value = false
  }
}

watch(globalSearchOpen, (isOpen: boolean) => {
  if (isOpen) globalSearchQuery.value = ''
})

onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeydown)
  document.addEventListener('pointerdown', closeUserMenuOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleGlobalKeydown)
  document.removeEventListener('pointerdown', closeUserMenuOutside)
})
</script>

<template>
  <div class="min-h-screen bg-canvas text-foreground">
    <div class="flex min-h-screen">
      <aside class="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-surface px-3 py-5 lg:flex">
        <NuxtLink to="/painel" class="mb-8 flex items-center gap-3 px-2" aria-label="ChipTest, ir ao painel">
          <span class="grid h-10 w-10 place-items-center rounded-card bg-primary text-primary-foreground shadow-sm"><Cpu :size="20" aria-hidden="true" /></span>
          <span class="min-w-0">
            <span class="block text-sm font-bold tracking-tight">ChipTest</span>
            <span class="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.14em] text-foreground-subtle">Chiptronic</span>
          </span>
        </NuxtLink>

        <div class="min-h-0 flex-1 overflow-y-auto px-1">
          <AppNavigation />
        </div>

        <div class="mt-4 border-t border-border pt-4">
          <div class="flex items-center gap-3 rounded-card bg-surface-raised p-3">
            <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-info-surface text-xs font-bold text-info">{{ initials }}</span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-xs font-semibold">{{ auth.perfil?.nome }}</span>
              <span class="mt-0.5 block truncate text-[10px] text-foreground-muted">{{ auth.perfil?.setor }}</span>
            </span>
            <NuxtLink to="/perfil" class="rounded-control p-1.5 text-foreground-subtle hover:bg-surface-muted hover:text-foreground" aria-label="Abrir meu perfil">
              <ChevronRight :size="15" aria-hidden="true" />
            </NuxtLink>
          </div>
        </div>
      </aside>

      <main class="min-w-0 flex-1">
        <header class="sticky top-0 z-20 border-b border-border bg-canvas/90 backdrop-blur-xl">
          <div class="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              class="interactive grid h-10 w-10 shrink-0 place-items-center rounded-control border border-border bg-surface text-foreground-muted hover:bg-surface-raised lg:hidden"
              aria-label="Abrir navegação"
              @click="mobileNavigationOpen = true"
            >
              <span class="relative flex h-4 w-4 flex-col justify-center gap-1" aria-hidden="true">
                <span class="h-px w-4 bg-current" /><span class="h-px w-3 bg-current" /><span class="h-px w-4 bg-current" />
              </span>
            </button>

            <div class="hidden min-w-0 items-center gap-2 text-xs text-foreground-subtle sm:flex">
              <span>ChipTest</span>
              <ChevronRight :size="14" aria-hidden="true" />
              <span class="truncate font-semibold text-foreground">{{ props.title }}</span>
            </div>
            <span class="min-w-0 flex-1 truncate text-sm font-semibold sm:hidden">{{ props.title }}</span>

            <button
              type="button"
              class="interactive ml-auto flex h-10 min-w-0 flex-1 items-center gap-2 rounded-control border border-border bg-surface px-3 text-left text-sm text-foreground-subtle hover:border-border-strong sm:ml-auto sm:max-w-[320px]"
              aria-label="Buscar no ChipTest"
              @click="globalSearchOpen = true"
            >
              <Search :size="16" class="shrink-0" aria-hidden="true" />
              <span class="hidden min-w-0 flex-1 truncate sm:block">Buscar no ChipTest...</span>
              <kbd class="hidden shrink-0 rounded border border-border bg-surface-raised px-1.5 py-0.5 font-mono text-[10px] sm:block">Ctrl K</kbd>
            </button>

            <UiThemeToggle compact />

            <div class="relative">
              <button
                ref="userMenuButton"
                type="button"
                class="interactive grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-surface text-xs font-bold text-foreground-muted hover:border-border-strong hover:bg-surface-raised"
                aria-label="Menu da conta"
                aria-controls="account-menu"
                :aria-expanded="userMenuOpen"
                @click="userMenuOpen = !userMenuOpen"
              >
                {{ initials }}
              </button>
              <div v-if="userMenuOpen" id="account-menu" ref="userMenuPanel" class="surface-popover absolute right-0 top-12 z-30 w-56 p-1.5">
                <div class="border-b border-border px-2.5 py-2">
                  <p class="truncate text-xs font-semibold">{{ auth.perfil?.nome }}</p>
                  <p class="mt-0.5 truncate text-[10px] text-foreground-muted">{{ auth.usuario?.email }}</p>
                </div>
                <NuxtLink to="/perfil" class="mt-1 flex items-center gap-2 rounded-control px-2.5 py-2 text-xs font-medium text-foreground-muted hover:bg-surface-raised hover:text-foreground" @click="userMenuOpen = false">
                  <ShieldCheck :size="15" aria-hidden="true" /> Meu perfil
                </NuxtLink>
                <button type="button" class="flex w-full items-center gap-2 rounded-control px-2.5 py-2 text-left text-xs font-medium text-foreground-muted hover:bg-surface-raised hover:text-foreground disabled:opacity-60" :disabled="loggingOut" @click="sair">
                  <LogOut :size="15" aria-hidden="true" /> {{ loggingOut ? 'Encerrando sessão...' : 'Sair da conta' }}
                </button>
              </div>
            </div>
          </div>
        </header>

        <div class="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
          <div class="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div class="min-w-0">
              <h1 class="text-2xl font-bold tracking-[-0.035em] sm:text-[28px]">{{ props.title }}</h1>
              <p class="mt-1.5 max-w-2xl text-sm leading-6 text-foreground-muted">{{ props.description }}</p>
            </div>
            <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
              <slot name="actions" />
            </div>
          </div>

          <AppAlert v-if="logoutError" tone="error" class="mb-5">{{ logoutError }}</AppAlert>
          <slot />
        </div>
      </main>
    </div>

    <UiOverlay
      v-model="mobileNavigationOpen"
      title="Navegação ChipTest"
      description="Acesse os módulos disponíveis."
      variant="drawer"
    >
      <div class="mt-2 max-h-[calc(100vh-12rem)] overflow-y-auto"><AppNavigation @navigate="mobileNavigationOpen = false" /></div>
    </UiOverlay>

    <UiOverlay
      v-model="globalSearchOpen"
      title="Busca global"
      description="Encontre uma área do ChipTest ou navegue para uma ação."
      initial-focus="#global-search-field"
    >
      <UiField id="global-search-field" v-model="globalSearchQuery" label="Pesquisar" placeholder="Painel, perfil, usuários..." autocomplete="off" />
      <ul v-if="searchItems.length" class="mt-3 space-y-1">
        <li v-for="item in searchItems" :key="item.to">
          <NuxtLink
            :to="item.to"
            class="interactive flex items-center gap-3 rounded-control px-3 py-2.5 hover:bg-surface-raised"
            @click="globalSearchOpen = false"
          >
            <component :is="item.icon" :size="16" class="text-foreground-subtle" aria-hidden="true" />
            <span class="min-w-0 flex-1">
              <span class="block text-sm font-semibold">{{ item.label }}</span>
              <span class="mt-0.5 block text-xs text-foreground-muted">{{ item.detail }}</span>
            </span>
            <ChevronRight :size="15" class="text-foreground-subtle" aria-hidden="true" />
          </NuxtLink>
        </li>
      </ul>
      <UiEmptyState v-else class="mt-4" title="Nenhum resultado encontrado" description="Tente buscar pelo nome de outra área disponível." :icon="Search" />
    </UiOverlay>
  </div>
</template>
