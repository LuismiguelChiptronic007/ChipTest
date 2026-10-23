<script setup lang="ts">
import {
  Activity,
  AlertTriangle,
  ArrowDownUp,
  ArrowRight,
  Bell,
  CheckCircle2,
  Command,
  ChevronRight,
  CircleDashed,
  Cpu,
  FileText,
  Gauge,
  Inbox,
  Info,
  LayoutDashboard,
  LockKeyhole,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
  XCircle,
} from '@lucide/vue'

definePageMeta({ layout: false })

const sections = [
  { id: 'foundations', label: 'Fundamentos', icon: Sparkles },
  { id: 'components', label: 'Componentes', icon: Settings2 },
  { id: 'patterns', label: 'Padrões de interface', icon: LayoutDashboard },
]

const statuses = [
  { label: 'Aprovado', tone: 'success' as const },
  { label: 'Em teste', tone: 'warning' as const },
  { label: 'Reprovado', tone: 'danger' as const },
  { label: 'Não testado', tone: 'neutral' as const },
  { label: 'Em análise', tone: 'info' as const },
]

const activeTab = ref('Visão geral')
const activeSection = ref('Fundamentos')
const demoTabs = [
  { label: 'Visão geral', value: 'Visão geral' },
  { label: 'Testes', value: 'Testes' },
  { label: 'Ocorrências', value: 'Ocorrências' },
]
const searchText = ref('')
const globalSearchText = ref('')
const globalSearchOpen = ref(false)
const userMenuOpen = ref(false)
const selectedRows = ref<string[]>([])
const modalAberto = ref(false)
const drawerAberto = ref(false)
const toastVisivel = ref(false)
const uploadFile = ref<File | null>(null)
const userMenuButton = ref<HTMLButtonElement>()
const userMenuPanel = ref<HTMLDivElement>()
const etapaAtual = ref(2)
const paginas = ref(1)
const erroDemo = ref('')
const demoSenha = ref('')

const records = [
  { code: 'CT-2048', vehicle: 'Volkswagen Golf', engine: '2.0 TSI · EA888', status: 'Aprovado', tone: 'success' as const, test: '22 out, 14:32' },
  { code: 'CT-2073', vehicle: 'Toyota Corolla', engine: '2.0 Dynamic Force', status: 'Em teste', tone: 'warning' as const, test: '22 out, 13:08' },
  { code: 'CT-1981', vehicle: 'Ford Ranger', engine: '3.0 V6 Power Stroke', status: 'Reprovado', tone: 'danger' as const, test: '21 out, 17:46' },
  { code: 'CT-2130', vehicle: 'Fiat Toro', engine: '2.0 Multijet II', status: 'Não testado', tone: 'neutral' as const, test: '—' },
]

const globalSearchItems = [
  { title: 'Códigos de veículos', detail: 'Pesquisar códigos e modelos', icon: Cpu, target: '#components' },
  { title: 'Testes recentes', detail: 'Execuções de bancada e campo', icon: Activity, target: '#patterns' },
  { title: 'Ocorrências', detail: 'Falhas e itens em análise', icon: AlertTriangle, target: '#patterns' },
]

const filteredGlobalSearchItems = computed(() => {
  const query = globalSearchText.value.trim().toLocaleLowerCase('pt-BR')
  if (!query) return globalSearchItems
  return globalSearchItems.filter(item => `${item.title} ${item.detail}`.toLocaleLowerCase('pt-BR').includes(query))
})
const activeDemoTabIndex = computed(() => demoTabs.findIndex(tab => tab.value === activeTab.value))

const isDark = computed(() => useTheme().isDark.value)

function handleGlobalShortcut(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    globalSearchOpen.value = true
  }
  if (event.key === 'Escape' && userMenuOpen.value) {
    userMenuOpen.value = false
    userMenuButton.value?.focus()
  }
}

function toggleUserMenu() {
  userMenuOpen.value = !userMenuOpen.value
}

watch(userMenuOpen, (isOpen: boolean) => {
  if (!isOpen) return
  nextTick(() => userMenuPanel.value?.querySelector<HTMLElement>('[role="menuitem"]')?.focus())
}, { flush: 'post' })

function handleUserMenuKeydown(event: KeyboardEvent) {
  const items = [...(event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[role="menuitem"]')]
  const currentIndex = items.indexOf(document.activeElement as HTMLElement)
  let nextIndex = currentIndex
  if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % items.length
  else if (event.key === 'ArrowUp') nextIndex = (currentIndex + items.length - 1) % items.length
  else if (event.key === 'Home') nextIndex = 0
  else if (event.key === 'End') nextIndex = items.length - 1
  else if (event.key !== 'Escape') return
  event.preventDefault()
  if (event.key === 'Escape') {
    userMenuOpen.value = false
    userMenuButton.value?.focus()
    return
  }
  items[nextIndex]?.focus()
}

function closeUserMenuOutside(event: PointerEvent) {
  const target = event.target
  if (
    userMenuOpen.value
    && target instanceof Node
    && !userMenuPanel.value?.contains(target)
    && !userMenuButton.value?.contains(target)
  ) {
    userMenuOpen.value = false
  }
}

function showToast() {
  toastVisivel.value = true
}

function toggleRow(code: string) {
  selectedRows.value = selectedRows.value.includes(code)
    ? selectedRows.value.filter((item: string) => item !== code)
    : [...selectedRows.value, code]
}

onMounted(() => {
  document.addEventListener('keydown', handleGlobalShortcut)
  document.addEventListener('pointerdown', closeUserMenuOutside)
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleGlobalShortcut)
  document.removeEventListener('pointerdown', closeUserMenuOutside)
})
</script>

<template>
  <div class="min-h-screen bg-canvas text-foreground">
    <div class="mx-auto flex min-h-screen max-w-[1600px]">
      <aside class="hidden w-60 shrink-0 border-r border-border bg-surface px-4 py-5 lg:flex lg:flex-col">
        <NuxtLink to="/login" class="mb-8 flex items-center gap-3 rounded-control px-2 py-1.5" aria-label="ChipTest, voltar ao login">
          <span class="grid h-9 w-9 place-items-center rounded-control bg-primary text-primary-foreground shadow-sm">
            <Cpu :size="19" stroke-width="2.2" aria-hidden="true" />
          </span>
          <span class="min-w-0">
            <span class="block text-sm font-bold tracking-tight">ChipTest</span>
            <span class="block text-[11px] text-foreground-subtle">Design system · v1.0</span>
          </span>
        </NuxtLink>

        <p class="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-foreground-subtle">Biblioteca</p>
        <nav class="space-y-1" aria-label="Navegação do design system">
          <a
            v-for="section in sections"
            :key="section.id"
            :href="`#${section.id}`"
            class="interactive flex min-h-9 items-center gap-2.5 rounded-control px-2.5 text-[13px] font-medium"
            :class="activeSection === section.label ? 'bg-info-surface text-info' : 'text-foreground-muted hover:bg-surface-muted hover:text-foreground'"
            @click="activeSection = section.label"
          >
            <component :is="section.icon" :size="16" aria-hidden="true" />
            {{ section.label }}
          </a>
        </nav>

        <div class="mt-auto rounded-card border border-border bg-surface-raised p-3.5">
          <div class="mb-2 flex items-center gap-2 text-xs font-semibold">
            <ShieldCheck :size="15" class="text-success" aria-hidden="true" />
            Acessibilidade
          </div>
          <p class="text-[11px] leading-relaxed text-foreground-muted">Foco visível, contraste AA, navegação por teclado e movimento reduzido.</p>
        </div>
      </aside>

      <main class="min-w-0 flex-1">
        <header class="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur sm:px-7">
          <div class="flex min-w-0 items-center gap-3">
            <nav aria-label="Caminho da página" class="hidden sm:block">
              <ol class="flex items-center gap-2 text-xs text-foreground-subtle">
                <li>Sistema</li><li aria-hidden="true"><ChevronRight :size="14" /></li>
              </ol>
            </nav>
            <span class="truncate text-sm font-semibold">Showcase de componentes</span>
            <UiBadge tone="info">Prévia</UiBadge>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <button type="button" class="interactive inline-flex min-h-9 items-center gap-2 rounded-control border border-border bg-surface px-2.5 text-xs text-foreground-subtle hover:border-border-strong hover:bg-surface-raised hover:text-foreground sm:px-3" aria-label="Abrir busca global" @click="globalSearchOpen = true">
              <Search :size="15" aria-hidden="true" />
              <span class="hidden lg:inline">Buscar códigos, testes...</span>
              <kbd class="hidden rounded border border-border bg-surface-raised px-1.5 py-0.5 font-mono text-[10px] md:inline">Ctrl K</kbd>
            </button>
            <UiThemeToggle />
            <div class="relative">
              <button ref="userMenuButton" type="button" class="grid h-9 w-9 place-items-center rounded-full bg-surface-muted text-xs font-bold text-foreground-muted hover:ring-2 hover:ring-primary/20" aria-label="Menu do usuário ChipTest" :aria-expanded="userMenuOpen" aria-haspopup="menu" @click="toggleUserMenu">
                CT
              </button>
              <div v-if="userMenuOpen" ref="userMenuPanel" role="menu" class="surface-popover absolute right-0 top-11 z-30 w-48 p-1.5" @keydown="handleUserMenuKeydown">
                <p class="px-2.5 py-2 text-[10px] font-semibold uppercase tracking-wider text-foreground-subtle">Conta de demonstração</p>
                <NuxtLink to="/login" role="menuitem" tabindex="-1" class="block rounded-control px-2.5 py-2 text-xs font-medium text-foreground-muted hover:bg-surface-raised hover:text-foreground">Meu perfil</NuxtLink>
                <button type="button" role="menuitem" tabindex="-1" class="w-full rounded-control px-2.5 py-2 text-left text-xs font-medium text-foreground-muted hover:bg-surface-raised hover:text-foreground" @click="userMenuOpen = false">Encerrar sessão</button>
              </div>
            </div>
          </div>
        </header>

        <div class="mx-auto max-w-[1220px] px-4 pb-16 pt-8 sm:px-7 sm:pt-10 xl:px-10">
          <section class="mb-10 flex flex-col justify-between gap-6 border-b border-border pb-8 md:flex-row md:items-end">
            <div class="max-w-2xl">
              <div class="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.13em] text-primary">
                <span class="h-1.5 w-1.5 rounded-full bg-primary" />
                Fundação visual
              </div>
              <h1 class="text-3xl font-bold tracking-[-0.045em] sm:text-4xl">Design system <span class="text-foreground-subtle">ChipTest</span></h1>
              <p class="mt-3 max-w-xl text-sm leading-6 text-foreground-muted sm:text-base">
                Uma linguagem visual precisa para diagnóstico, testes e engenharia veicular. Cada elemento foi pensado para leitura rápida e decisões seguras.
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <UiButton variant="secondary" @click="showToast">
                <template #icon><Bell :size="16" aria-hidden="true" /></template>
                Notificar
              </UiButton>
              <UiButton variant="primary" @click="modalAberto = true">
                <template #icon><Plus :size="16" aria-hidden="true" /></template>
                Ação principal
              </UiButton>
            </div>
          </section>

          <section id="foundations" class="scroll-mt-24 space-y-8">
            <div class="flex items-end justify-between gap-4">
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.13em] text-foreground-subtle">01 · Fundamentos</p>
                <h2 class="mt-1 text-xl font-bold tracking-tight">Uma base consistente</h2>
              </div>
              <span class="hidden items-center gap-1.5 text-xs text-foreground-subtle sm:flex"><CircleDashed :size="14" /> Tokenizado e responsivo</span>
            </div>

            <div class="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
              <UiCard padding="normal">
                <div class="mb-5 flex items-start justify-between gap-3">
                  <div>
                    <h3 class="text-sm font-bold">Paleta de interface</h3>
                    <p class="mt-1 text-xs text-foreground-muted">Tokens CSS centralizados · modo {{ isDark ? 'escuro' : 'claro' }} ativo</p>
                  </div>
                  <SlidersHorizontal :size="16" class="text-foreground-subtle" aria-hidden="true" />
                </div>
                <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div v-for="swatch in [
                    { name: 'Canvas', token: 'canvas', color: 'bg-canvas', text: 'text-foreground' },
                    { name: 'Superfície', token: 'surface', color: 'bg-surface border border-border', text: 'text-foreground' },
                    { name: 'Grafite', token: 'foreground', color: 'bg-foreground', text: 'text-surface' },
                    { name: 'Ação elétrica', token: 'primary', color: 'bg-primary', text: 'text-primary-foreground' },
                    { name: 'Aprovado', token: 'success', color: 'bg-success', text: 'text-surface' },
                    { name: 'Reprovado', token: 'danger', color: 'bg-danger', text: 'text-danger-foreground' },
                    { name: 'Em teste', token: 'warning', color: 'bg-warning', text: 'text-surface' },
                    { name: 'Neutro', token: 'neutral', color: 'bg-neutral', text: 'text-surface' },
                  ]" :key="swatch.token" class="min-w-0">
                    <div class="mb-2 flex h-14 items-end rounded-control p-2" :class="[swatch.color, swatch.text]">
                      <span class="font-mono text-[10px] font-medium">{{ swatch.token }}</span>
                    </div>
                    <p class="truncate text-xs font-semibold">{{ swatch.name }}</p>
                    <p class="mt-0.5 text-[10px] text-foreground-subtle">var(--{{ swatch.token }})</p>
                  </div>
                </div>
              </UiCard>

              <UiCard padding="normal">
                <div class="mb-4 flex items-center justify-between">
                  <div>
                    <h3 class="text-sm font-bold">Temas e contraste</h3>
                    <p class="mt-1 text-xs text-foreground-muted">Prévia simultânea dos dois modos</p>
                  </div>
                  <Info :size="16" class="text-foreground-subtle" aria-hidden="true" />
                </div>
                <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  <div data-theme="light" class="theme-sample rounded-card border border-border p-3.5">
                    <div class="mb-3 flex items-center justify-between">
                      <span class="text-xs font-bold">Claro</span>
                      <span class="h-2 w-2 rounded-full bg-success" />
                    </div>
                    <div class="rounded-control border border-border bg-surface p-3">
                      <p class="text-[11px] font-semibold text-foreground">Dados do veículo</p>
                      <p class="mt-1 font-mono text-xs text-foreground-muted">CT-2048 · 2.0 TSI</p>
                      <div class="mt-2 flex items-center justify-between">
                        <span class="text-[10px] text-foreground-muted">Teste de bancada</span>
                        <UiBadge tone="success" dot>Aprovado</UiBadge>
                      </div>
                    </div>
                  </div>
                  <div data-theme="dark" class="theme-sample rounded-card border border-border p-3.5">
                    <div class="mb-3 flex items-center justify-between">
                      <span class="text-xs font-bold">Escuro</span>
                      <span class="h-2 w-2 rounded-full bg-success" />
                    </div>
                    <div class="rounded-control border border-border bg-surface p-3">
                      <p class="text-[11px] font-semibold text-foreground">Dados do veículo</p>
                      <p class="mt-1 font-mono text-xs text-foreground-muted">CT-2048 · 2.0 TSI</p>
                      <div class="mt-2 flex items-center justify-between">
                        <span class="text-[10px] text-foreground-muted">Teste de bancada</span>
                        <UiBadge tone="success" dot>Aprovado</UiBadge>
                      </div>
                    </div>
                  </div>
                </div>
                <p class="mt-3 text-[11px] leading-relaxed text-foreground-muted">O tema inicial acompanha o sistema operacional. A escolha manual fica salva neste dispositivo.</p>
              </UiCard>
            </div>

            <div class="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <UiCard padding="normal">
                <div class="mb-5">
                  <h3 class="text-sm font-bold">Tipografia</h3>
                  <p class="mt-1 text-xs text-foreground-muted">Inter para interface · JetBrains Mono para dados técnicos</p>
                </div>
                <p class="text-2xl font-semibold tracking-tight">Precisão em cada teste.</p>
                <p class="mt-1 text-sm text-foreground-muted">Sensores, estados e parâmetros com leitura clara.</p>
                <div class="mt-5 rounded-control bg-surface-raised p-3.5">
                  <p class="font-mono text-sm font-medium">CT-2048 <span class="text-foreground-subtle">/</span> 12.8 V <span class="text-foreground-subtle">/</span> 1,850 RPM</p>
                  <p class="mt-1 font-mono text-[11px] text-foreground-muted">ID: 7f32-a91c · CAN 500 kbit/s</p>
                </div>
                <div class="mt-4 flex flex-wrap gap-2 text-[10px] text-foreground-subtle">
                  <span>12 / 14 / 16 / 20 / 32 px</span>
                  <span>·</span>
                  <span>pesos 400–700</span>
                  <span>·</span>
                  <span>escala mono dedicada</span>
                </div>
              </UiCard>

              <UiCard padding="normal">
                <div class="mb-5 flex items-start justify-between">
                  <div>
                    <h3 class="text-sm font-bold">Tokens de status</h3>
                    <p class="mt-1 text-xs text-foreground-muted">Cores semânticas com rótulos e ícones, não apenas cor</p>
                  </div>
                  <Activity :size="16" class="text-foreground-subtle" aria-hidden="true" />
                </div>
                <div class="flex flex-wrap gap-2">
                  <UiBadge v-for="status in statuses" :key="status.label" :tone="status.tone" dot>{{ status.label }}</UiBadge>
                </div>
                <div class="mt-5 grid gap-3 sm:grid-cols-3">
                  <div class="rounded-control bg-success-surface p-3 text-success"><CheckCircle2 :size="16" /><p class="mt-2 text-xs font-semibold">Aprovado</p><p class="mt-0.5 text-[10px] opacity-90">Concluído com sucesso</p></div>
                  <div class="rounded-control bg-warning-surface p-3 text-warning"><AlertTriangle :size="16" /><p class="mt-2 text-xs font-semibold">Em validação</p><p class="mt-0.5 text-[10px] opacity-90">Atenção necessária</p></div>
                  <div class="rounded-control bg-danger-surface p-3 text-danger"><XCircle :size="16" /><p class="mt-2 text-xs font-semibold">Falha detectada</p><p class="mt-0.5 text-[10px] opacity-90">Requer análise</p></div>
                </div>
              </UiCard>
            </div>
          </section>

          <section id="components" class="mt-12 scroll-mt-24 space-y-8">
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.13em] text-foreground-subtle">02 · Componentes</p>
              <h2 class="mt-1 text-xl font-bold tracking-tight">Peças para o trabalho diário</h2>
            </div>

            <div class="grid gap-4 xl:grid-cols-2">
              <UiCard>
                <div class="mb-5">
                  <h3 class="text-sm font-bold">Ações e estados</h3>
                  <p class="mt-1 text-xs text-foreground-muted">Quatro níveis de ênfase, três densidades e estado ocupado</p>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <UiButton variant="primary"><template #icon><Plus :size="16" /></template>Novo teste</UiButton>
                  <UiButton variant="secondary">Secundário</UiButton>
                  <UiButton variant="ghost">Discreto</UiButton>
                  <UiButton variant="danger">Excluir</UiButton>
                  <UiButton variant="primary" :loading="true">Salvando</UiButton>
                  <UiButton variant="secondary" :disabled="true">Indisponível</UiButton>
                </div>
                <div class="mt-4 flex flex-wrap items-center gap-2">
                  <UiButton size="sm" variant="secondary">Compacto</UiButton>
                  <UiButton size="md" variant="secondary">Padrão</UiButton>
                  <UiButton size="lg" variant="secondary">Confortável</UiButton>
                  <span class="inline-flex h-10 w-10 items-center justify-center rounded-control border border-border text-foreground-muted hover:bg-surface-muted" title="Mais opções" aria-label="Mais opções"><MoreHorizontal :size="17" /></span>
                </div>
              </UiCard>

              <UiCard>
                <div class="mb-5">
                  <h3 class="text-sm font-bold">Campos e busca</h3>
                  <p class="mt-1 text-xs text-foreground-muted">Rótulos explícitos, ajuda contextual, erro associado e foco</p>
                </div>
                <div class="grid gap-4 sm:grid-cols-2">
                  <UiField id="vehicle-code" v-model="searchText" label="Código do veículo" placeholder="Ex.: CT-2048" hint="Use o código impresso na etiqueta." />
                  <UiSelect id="demo-select" label="Setor responsável" :options="[{ label: 'Engenharia', value: 'engenharia' }, { label: 'Bancada', value: 'bancada' }, { label: 'Campo', value: 'campo' }]" model-value="engenharia" hint="Opções carregadas conforme a equipe." />
                  <div class="sm:col-span-2">
                    <UiField id="demo-password" v-model="demoSenha" label="Senha de acesso" type="password" placeholder="Digite sua senha" :error="erroDemo" @blur="erroDemo = demoSenha.length > 0 && demoSenha.length < 8 ? 'Use pelo menos 8 caracteres.' : ''" />
                  </div>
                </div>
                <div class="mt-4 flex flex-wrap gap-2">
                  <UiSearch v-model="searchText" class="flex-1" label="Buscar veículos" placeholder="Buscar por código, veículo..." shortcut="⌘ K" />
                  <UiButton variant="secondary"><template #icon><SlidersHorizontal :size="16" /></template>Filtros</UiButton>
                </div>
              </UiCard>

              <UiCard padding="compact">
                <div class="mb-4 flex items-start justify-between">
                  <div><h3 class="text-sm font-bold">Métricas</h3><p class="mt-1 text-xs text-foreground-muted">Resumo de operação em cards compactos</p></div>
                  <span class="rounded-control bg-surface-raised p-2 text-foreground-muted"><Gauge :size="16" /></span>
                </div>
                <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div v-for="metric in [
                    { title: 'Códigos ativos', value: '1.284', delta: '+8,2%', icon: Cpu, tone: 'text-primary' },
                    { title: 'Aprovados', value: '942', delta: '+12,4%', icon: CheckCircle2, tone: 'text-success' },
                    { title: 'Em bancada', value: '38', delta: '+3 hoje', icon: Activity, tone: 'text-warning' },
                    { title: 'Ocorrências', value: '06', delta: '−2 semana', icon: AlertTriangle, tone: 'text-danger' },
                  ]" :key="metric.title" class="rounded-control border border-border bg-surface p-3.5">
                    <component :is="metric.icon" :size="16" :class="metric.tone" />
                    <p class="mt-3 text-[11px] text-foreground-muted">{{ metric.title }}</p>
                    <div class="mt-1 flex items-end justify-between gap-1"><span class="text-xl font-bold tracking-tight">{{ metric.value }}</span><span class="pb-0.5 text-[10px] font-semibold text-success">{{ metric.delta }}</span></div>
                  </div>
                </div>
              </UiCard>

              <UiCard>
                <div class="mb-4 flex items-start justify-between">
                  <div><h3 class="text-sm font-bold">Abas, stepper e paginação</h3><p class="mt-1 text-xs text-foreground-muted">Navegação de contexto sem perder a orientação</p></div>
                  <FileText :size="16" class="text-foreground-subtle" />
                </div>
                <UiTabs id="demo-tabs" v-model="activeTab" :tabs="demoTabs" ariaLabel="Seções do código" />
                <div :id="`demo-tabs-panel-${activeDemoTabIndex}`" role="tabpanel" :aria-labelledby="`demo-tabs-tab-${activeDemoTabIndex}`" tabindex="0" class="mt-3 rounded-control bg-surface-raised px-3 py-2 text-xs text-foreground-muted">
                  {{ activeTab }} do veículo · Seções, histórico e estado de validação.
                </div>
                <div class="mt-5">
                  <UiStepper :steps="['Enviar arquivo', 'Revisar seções', 'Confirmar']" :current-step="etapaAtual" aria-label="Etapas de importação" />
                </div>
                <UiPagination v-model:page="paginas" :total-pages="6" :total-items="24" :page-size="4" class="mt-5" />
              </UiCard>

              <UiCard class="xl:col-span-2">
                <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div><h3 class="text-sm font-bold">Tabela técnica</h3><p class="mt-1 text-xs text-foreground-muted">Cabeçalho fixo, seleção em lote e ações disponíveis no contexto</p></div>
                  <UiButton size="sm" variant="secondary"><template #icon><ArrowDownUp :size="14" /></template>Ordenar por data</UiButton>
                </div>
                <UiDataTable>
                  <template #mobile>
                  <article v-for="record in records" :key="record.code" class="rounded-control border border-border bg-surface-raised p-3">
                    <div class="flex items-start justify-between gap-3">
                      <div class="flex min-w-0 items-start gap-2.5">
                        <input type="checkbox" :aria-label="`Selecionar ${record.code}`" :checked="selectedRows.includes(record.code)" class="mt-1 accent-primary" @change="toggleRow(record.code)">
                        <div class="min-w-0"><p class="font-mono text-xs font-medium">{{ record.code }}</p><p class="mt-0.5 truncate text-xs text-foreground-muted">{{ record.vehicle }}</p></div>
                      </div>
                      <UiBadge :tone="record.tone" dot>{{ record.status }}</UiBadge>
                    </div>
                    <div class="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2.5 text-[10px] text-foreground-muted">
                      <span class="truncate">{{ record.engine }}</span><span class="shrink-0">{{ record.test }}</span>
                    </div>
                  </article>
                  </template>
                  <table class="min-w-[650px]">
                    <thead class="sticky top-0 bg-surface-raised">
                      <tr class="text-[10px] font-bold uppercase tracking-[0.08em] text-foreground-subtle">
                        <th class="rounded-l-control px-3 py-2.5"><span class="sr-only">Selecionar</span><input type="checkbox" aria-label="Selecionar todos os códigos" :checked="selectedRows.length === records.length" class="accent-primary" @change="selectedRows = selectedRows.length === records.length ? [] : records.map(item => item.code)"></th>
                        <th class="px-3 py-2.5">Código / veículo</th><th class="px-3 py-2.5">Motorização</th><th class="px-3 py-2.5">Status</th><th class="px-3 py-2.5">Último teste</th><th class="rounded-r-control px-3 py-2.5"><span class="sr-only">Ações</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="record in records" :key="record.code" class="group text-xs hover:bg-surface-raised">
                        <td class="border-b border-border px-3 py-3"><input type="checkbox" :aria-label="`Selecionar ${record.code}`" :checked="selectedRows.includes(record.code)" class="accent-primary" @change="toggleRow(record.code)"></td>
                        <td class="border-b border-border px-3 py-3"><p class="font-mono font-medium text-foreground">{{ record.code }}</p><p class="mt-0.5 text-[11px] text-foreground-muted">{{ record.vehicle }}</p></td>
                        <td class="border-b border-border px-3 py-3 text-foreground-muted">{{ record.engine }}</td>
                        <td class="border-b border-border px-3 py-3"><UiBadge :tone="record.tone" dot>{{ record.status }}</UiBadge></td>
                        <td class="border-b border-border px-3 py-3 text-foreground-muted">{{ record.test }}</td>
                        <td class="border-b border-border px-3 py-3 text-right"><button type="button" class="rounded-control p-1.5 text-foreground-subtle opacity-100 hover:bg-surface-muted hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100" :aria-label="`Mais ações para ${record.code}`"><MoreHorizontal :size="16" /></button></td>
                      </tr>
                    </tbody>
                  </table>
                </UiDataTable>
                <div v-if="selectedRows.length" class="mt-3 flex items-center justify-between rounded-control bg-info-surface px-3 py-2 text-xs text-info"><span>{{ selectedRows.length }} códigos selecionados</span><button type="button" class="font-semibold hover:underline" @click="selectedRows = []">Limpar seleção</button></div>
              </UiCard>

              <UiCard>
                <div class="mb-4"><h3 class="text-sm font-bold">Upload por arrastar</h3><p class="mt-1 text-xs text-foreground-muted">Área de soltura com feedback de seleção</p></div>
                <UiFileUpload v-model="uploadFile" />
              </UiCard>

              <UiCard>
                <div class="mb-4"><h3 class="text-sm font-bold">Feedback e estados</h3><p class="mt-1 text-xs text-foreground-muted">Toast não bloqueante, skeletons e estado vazio</p></div>
                <div class="flex flex-wrap gap-2">
                  <UiButton variant="secondary" size="sm" @click="showToast"><template #icon><CheckCircle2 :size="14" /></template>Mostrar toast</UiButton>
                  <UiButton variant="secondary" size="sm" @click="drawerAberto = true"><template #icon><ArrowRight :size="14" /></template>Abrir drawer</UiButton>
                  <UiTooltip id="demo-tooltip" text="Dica contextual">
                    <UiButton variant="ghost" size="sm" aria-describedby="tooltip-demo">Passe o mouse</UiButton>
                  </UiTooltip>
                </div>
                <div class="mt-4 space-y-2">
                  <UiSkeleton variant="line" />
                  <UiSkeleton variant="block" />
                  <div class="flex items-center gap-3 rounded-control border border-border bg-surface-raised px-3 py-2.5"><Inbox :size="17" class="text-foreground-subtle" /><div><p class="text-xs font-semibold">Nenhuma ocorrência</p><p class="mt-0.5 text-[10px] text-foreground-muted">Quando houver atualizações, elas aparecerão aqui.</p></div></div>
                </div>
              </UiCard>
            </div>
          </section>

          <section id="patterns" class="mt-12 scroll-mt-24 space-y-6">
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.13em] text-foreground-subtle">03 · Padrões de interface</p>
              <h2 class="mt-1 text-xl font-bold tracking-tight">Contexto que orienta a ação</h2>
            </div>
            <div class="grid gap-4 xl:grid-cols-3">
              <UiCard>
                <div class="mb-4 flex items-start justify-between"><div><h3 class="text-sm font-bold">Atividade recente</h3><p class="mt-1 text-xs text-foreground-muted">Resumo compacto de eventos</p></div><button type="button" title="Ver opções" class="text-foreground-subtle"><MoreHorizontal :size="17" /></button></div>
                <div class="space-y-4">
                  <div v-for="item in [
                    { icon: CheckCircle2, title: 'Teste de bancada aprovado', detail: 'CT-2048 · há 12 minutos', tone: 'text-success' },
                    { icon: AlertTriangle, title: 'Ocorrência em análise', detail: 'CT-1981 · há 48 minutos', tone: 'text-warning' },
                    { icon: Users, title: 'Novo usuário liberado', detail: 'Equipe de Engenharia · há 2 h', tone: 'text-info' },
                  ]" :key="item.title" class="flex gap-3">
                    <span class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-raised" :class="item.tone"><component :is="item.icon" :size="15" /></span>
                    <div class="min-w-0"><p class="text-xs font-semibold">{{ item.title }}</p><p class="mt-0.5 text-[11px] text-foreground-muted">{{ item.detail }}</p></div>
                  </div>
                </div>
                <button type="button" class="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">Ver atividade <ArrowRight :size="13" /></button>
              </UiCard>

              <UiCard>
                <div class="mb-4"><h3 class="text-sm font-bold">Resumo de validação</h3><p class="mt-1 text-xs text-foreground-muted">Indicadores de teste legíveis em qualquer tema</p></div>
                <div class="flex items-center gap-4">
                  <div class="relative grid h-28 w-28 shrink-0 place-items-center rounded-full" style="background: conic-gradient(hsl(var(--success)) 0deg 250deg, hsl(var(--warning)) 250deg 300deg, hsl(var(--danger)) 300deg 330deg, hsl(var(--neutral-surface)) 330deg 360deg)">
                    <div class="grid h-[5.1rem] w-[5.1rem] place-items-center rounded-full bg-surface"><div class="text-center"><p class="text-xl font-bold tracking-tight">72%</p><p class="text-[9px] text-foreground-muted">aprovados</p></div></div>
                  </div>
                  <div class="min-w-0 flex-1 space-y-2.5">
                    <div v-for="legend in [{ label: 'Aprovados', value: '72%', tone: 'bg-success' }, { label: 'Em teste', value: '14%', tone: 'bg-warning' }, { label: 'Reprovados', value: '8%', tone: 'bg-danger' }, { label: 'Não testados', value: '6%', tone: 'bg-neutral' }]" :key="legend.label" class="flex items-center justify-between gap-2 text-[11px]"><span class="flex items-center gap-2 text-foreground-muted"><span class="h-2 w-2 rounded-full" :class="legend.tone" />{{ legend.label }}</span><strong class="font-mono font-medium">{{ legend.value }}</strong></div>
                  </div>
                </div>
              </UiCard>

              <UiCard>
                <div class="mb-4"><h3 class="text-sm font-bold">Estados sem conteúdo</h3><p class="mt-1 text-xs text-foreground-muted">Orientação clara sem tela morta</p></div>
                <UiEmptyState title="Nenhum código cadastrado" description="Adicione o primeiro veículo para começar a acompanhar testes.">
                  <template #action><UiButton variant="primary" size="sm"><template #icon><Plus :size="14" /></template>Novo código</UiButton></template>
                </UiEmptyState>
              </UiCard>
            </div>
          </section>

          <footer class="mt-12 flex flex-col justify-between gap-3 border-t border-border pt-5 text-[11px] text-foreground-subtle sm:flex-row sm:items-center">
            <p>ChipTest UI · Inter + JetBrains Mono · Lucide</p>
            <p class="flex items-center gap-1.5"><LockKeyhole :size="12" /> Interface desenhada para leitura técnica e acessibilidade.</p>
          </footer>
        </div>
      </main>
    </div>

    <UiOverlay v-model="globalSearchOpen" title="Busca global" description="Encontre rapidamente códigos, testes e ocorrências." initial-focus="input">
      <UiSearch v-model="globalSearchText" label="Busca global" placeholder="Digite o que você procura..." />
      <div class="mt-4 space-y-1">
        <NuxtLink v-for="item in filteredGlobalSearchItems" :key="item.title" :to="item.target" class="flex items-center gap-3 rounded-control px-3 py-2.5 hover:bg-surface-raised" @click="globalSearchOpen = false">
          <component :is="item.icon" :size="16" class="text-foreground-subtle" aria-hidden="true" />
          <span class="min-w-0 flex-1"><span class="block text-xs font-semibold">{{ item.title }}</span><span class="mt-0.5 block text-[11px] text-foreground-muted">{{ item.detail }}</span></span>
          <ArrowRight :size="14" class="text-foreground-subtle" aria-hidden="true" />
        </NuxtLink>
        <p v-if="!filteredGlobalSearchItems.length" class="px-3 py-4 text-center text-xs text-foreground-muted">Nenhum resultado encontrado.</p>
      </div>
      <template #footer>
        <p class="mr-auto flex items-center gap-1.5 text-[10px] text-foreground-subtle"><Command :size="12" /> Enter para abrir · Esc para fechar</p>
        <UiButton variant="secondary" size="sm" @click="globalSearchOpen = false">Fechar</UiButton>
      </template>
    </UiOverlay>

    <UiToast v-model="toastVisivel" title="Tudo certo" description="Ação concluída com sucesso." />

    <UiOverlay v-model="modalAberto" title="Criar novo teste?" description="O fluxo de confirmação mantém o contexto e deixa claro o impacto da ação antes de prosseguir.">
      <template #footer>
        <UiButton variant="secondary" @click="modalAberto = false">Cancelar</UiButton>
        <UiButton variant="primary" @click="modalAberto = false">Continuar <template #icon><ArrowRight :size="15" /></template></UiButton>
      </template>
    </UiOverlay>

    <UiOverlay v-model="drawerAberto" variant="drawer" title="Detalhes do teste" description="Resumo do veículo e execução atual.">
      <div class="rounded-card border border-border bg-surface-raised p-4"><p class="text-[10px] font-semibold uppercase tracking-wider text-foreground-subtle">Código</p><p class="mt-1 font-mono text-lg font-medium">CT-2048</p><p class="mt-2 text-xs text-foreground-muted">Volkswagen Golf · 2.0 TSI</p></div>
      <div class="mt-4 space-y-3 text-xs"><p class="flex justify-between"><span class="text-foreground-muted">Responsável</span><span class="font-medium">Marina Costa</span></p><p class="flex justify-between"><span class="text-foreground-muted">Tipo</span><span class="font-medium">Bancada · #3</span></p><p class="flex justify-between"><span class="text-foreground-muted">Duração</span><span class="font-mono">01:42:18</span></p></div>
      <template #footer>
        <UiButton class="flex-1" variant="secondary" @click="drawerAberto = false">Fechar</UiButton>
        <UiButton class="flex-1" variant="primary" @click="drawerAberto = false">Abrir teste</UiButton>
      </template>
    </UiOverlay>
  </div>
</template>

<style scoped>
.theme-sample[data-theme='light'] {
  background: hsl(var(--canvas));
}

.theme-sample[data-theme='dark'] {
  background: hsl(var(--canvas));
  color: hsl(var(--foreground));
}

</style>
