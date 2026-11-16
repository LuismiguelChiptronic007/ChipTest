<script setup lang="ts">
import { Users } from '@lucide/vue'
import { z } from 'zod'
import { papeis, type Papel, type UsuarioAdmin } from '~/types/auth'

definePageMeta({ middleware: ['admin'] })

const auth = useAuthStore()
const usuarios = ref<UsuarioAdmin[]>([])
const erro = ref('')
const busca = ref('')
const filtroStatus = ref<'todos' | 'ativos' | 'pendentes'>('todos')
const sucesso = ref(false)
const sucessoMensagem = ref('')
const carregando = ref(true)
const atualizandoId = ref<string | null>(null)
const filtroOptions = [
  { label: 'Todos', value: 'todos' },
  { label: 'Ativos', value: 'ativos' },
  { label: 'Aguardando liberação', value: 'pendentes' },
] as const

const usuariosSchema = z.array(z.object({
  id: z.string().uuid(),
  nome: z.string(),
  email: z.string().email(),
  setor_id: z.string().uuid(),
  setor: z.string(),
  papel: z.enum(papeis),
  ativo: z.boolean(),
}))

const usuariosFiltrados = computed(() => {
  const termo = busca.value.trim().toLocaleLowerCase('pt-BR')
  return usuarios.value.filter((usuario: UsuarioAdmin) => {
    const correspondeBusca = !termo || `${usuario.nome} ${usuario.email} ${usuario.setor}`.toLocaleLowerCase('pt-BR').includes(termo)
    const correspondeStatus = filtroStatus.value === 'todos'
      || (filtroStatus.value === 'ativos' && usuario.ativo)
      || (filtroStatus.value === 'pendentes' && !usuario.ativo)
    return correspondeBusca && correspondeStatus
  })
})
const usuariosAtivos = computed(() => usuarios.value.filter((usuario: UsuarioAdmin) => usuario.ativo).length)
const usuariosPendentes = computed(() => usuarios.value.length - usuariosAtivos.value)

function iniciais(nome: string) {
  return nome.trim().split(/\s+/).slice(0, 2).map(parte => parte[0]).join('').toLocaleUpperCase('pt-BR')
}

function notificarSucesso(mensagem: string) {
  sucessoMensagem.value = mensagem
  sucesso.value = true
}

function selecionarFiltro(value: typeof filtroStatus.value) {
  filtroStatus.value = value
}

async function carregarUsuarios() {
  erro.value = ''
  sucesso.value = false
  carregando.value = true
  try {
    const resposta = await $fetch<{ usuarios: unknown }>('/api/admin/usuarios')
    const validacaoUsuarios = usuariosSchema.safeParse(resposta.usuarios)
    if (!validacaoUsuarios.success) {
      throw new Error('Os dados recebidos para a lista de usuários estão inválidos.')
    }

    usuarios.value = validacaoUsuarios.data
  } catch (error: unknown) {
    erro.value = mensagemDeErro(error, 'Não foi possível carregar os usuários.')
  } finally {
    carregando.value = false
  }
}

async function atualizarPapel(usuario: UsuarioAdmin, papel: Papel) {
  erro.value = ''
  sucesso.value = false
  if (usuario.id === auth.usuario?.id && papel !== 'admin') {
    erro.value = 'Não é possível remover seu próprio papel de administrador.'
    return
  }

  atualizandoId.value = usuario.id
  try {
    await $fetch('/api/admin/usuarios', {
      method: 'PATCH',
      body: { id: usuario.id, papel },
    })
    usuario.papel = papel
    notificarSucesso(`Papel de ${usuario.nome} atualizado para ${papel}.`)
  } catch (error: unknown) {
    erro.value = mensagemDeErro(error, 'Não foi possível alterar o papel.')
  } finally {
    atualizandoId.value = null
  }
}

function selecionarPapel(usuario: UsuarioAdmin, event: Event) {
  if (!(event.target instanceof HTMLSelectElement)) return
  const validacao = z.enum(papeis).safeParse(event.target.value)
  if (!validacao.success) {
    erro.value = 'O papel selecionado é inválido.'
    return
  }
  void atualizarPapel(usuario, validacao.data)
}

async function alternarAtivo(usuario: UsuarioAdmin) {
  erro.value = ''
  sucesso.value = false
  if (usuario.id === auth.usuario?.id && usuario.ativo) {
    erro.value = 'Não é possível desativar sua própria conta de administrador.'
    return
  }

  atualizandoId.value = usuario.id
  try {
    const ativo = !usuario.ativo
    await $fetch('/api/admin/usuarios', {
      method: 'PATCH',
      body: { id: usuario.id, ativo },
    })
    usuario.ativo = ativo
    notificarSucesso(ativo ? `Acesso de ${usuario.nome} liberado.` : `Acesso de ${usuario.nome} desativado.`)
  } catch (error: unknown) {
    erro.value = mensagemDeErro(error, 'Não foi possível atualizar o acesso.')
  } finally {
    atualizandoId.value = null
  }
}

onMounted(carregarUsuarios)
</script>

<template>
  <AppShell title="Usuários" description="Gerencie os acessos da equipe, seus setores e papéis no ChipTest.">
    <template #actions>
      <UiBadge tone="neutral">{{ usuarios.length }} {{ usuarios.length === 1 ? 'usuário' : 'usuários' }}</UiBadge>
    </template>

    <AppAlert v-if="erro" tone="error" class="mb-4">{{ erro }}</AppAlert>
    <section aria-label="Resumo de usuários" class="mb-5 grid gap-3 sm:grid-cols-2">
      <UiCard padding="compact">
        <div class="flex items-center justify-between gap-4">
          <div><p class="text-xs font-medium text-foreground-muted">Acessos ativos</p><p class="mt-2 font-mono text-2xl font-semibold">{{ usuariosAtivos }}</p></div>
          <UiBadge tone="success" dot>Ativos</UiBadge>
        </div>
      </UiCard>
      <UiCard padding="compact">
        <div class="flex items-center justify-between gap-4">
          <div><p class="text-xs font-medium text-foreground-muted">Aguardando liberação</p><p class="mt-2 font-mono text-2xl font-semibold">{{ usuariosPendentes }}</p></div>
          <UiBadge tone="warning" dot>Pendentes</UiBadge>
        </div>
      </UiCard>
    </section>

    <section class="surface-card overflow-hidden">
      <div class="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div class="w-full sm:max-w-sm">
          <UiSearch v-model="busca" label="Buscar usuários" placeholder="Nome, e-mail ou setor..." />
        </div>
        <div class="flex flex-wrap items-center gap-1 rounded-control bg-surface-raised p-1" aria-label="Filtrar por status">
          <button
            v-for="opcao in filtroOptions"
            :key="opcao.value"
            type="button"
            class="interactive min-h-8 rounded px-3 text-xs font-semibold"
            :class="filtroStatus === opcao.value ? 'bg-surface text-foreground shadow-sm' : 'text-foreground-muted hover:text-foreground'"
            :aria-pressed="filtroStatus === opcao.value"
            @click="selecionarFiltro(opcao.value)"
          >{{ opcao.label }}</button>
        </div>
      </div>

      <div v-if="carregando" class="space-y-3 p-5" aria-label="Carregando usuários">
        <UiSkeleton v-for="linha in 4" :key="linha" variant="block" />
      </div>
      <div v-else-if="usuariosFiltrados.length === 0" class="p-5 sm:p-8">
        <UiEmptyState
          :title="usuarios.length ? 'Nenhum usuário encontrado' : 'Ainda não há usuários'"
          :description="usuarios.length ? 'Ajuste a busca ou o filtro para ver outros resultados.' : 'Os novos pedidos de acesso aparecerão aqui para aprovação.'"
          :icon="Users"
        />
      </div>

      <div v-else>
        <div class="hidden max-h-[620px] overflow-auto sm:block">
          <table class="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
            <thead class="sticky top-0 z-10 bg-surface-raised text-[10px] uppercase tracking-[0.12em] text-foreground-subtle">
              <tr>
                <th scope="col" class="border-b border-border px-5 py-3.5 font-bold">Pessoa</th>
                <th scope="col" class="border-b border-border px-5 py-3.5 font-bold">Setor</th>
                <th scope="col" class="border-b border-border px-5 py-3.5 font-bold">Papel</th>
                <th scope="col" class="border-b border-border px-5 py-3.5 font-bold">Status</th>
                <th scope="col" class="border-b border-border px-5 py-3.5 font-bold">Acesso</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="usuario in usuariosFiltrados" :key="usuario.id" class="group hover:bg-surface-raised/70">
                <td class="border-b border-border/70 px-5 py-4">
                  <div class="flex items-center gap-3">
                    <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-info-surface text-[11px] font-bold text-info">{{ iniciais(usuario.nome) }}</span>
                    <span class="min-w-0">
                      <span class="block truncate font-semibold">{{ usuario.nome }} <span v-if="usuario.id === auth.usuario?.id" class="text-[10px] font-medium text-foreground-subtle">(você)</span></span>
                      <span class="mt-0.5 block truncate text-xs text-foreground-muted">{{ usuario.email }}</span>
                    </span>
                  </div>
                </td>
                <td class="border-b border-border/70 px-5 py-4 text-foreground-muted">{{ usuario.setor }}</td>
                <td class="border-b border-border/70 px-5 py-4">
                  <select
                    :value="usuario.papel"
                    :disabled="atualizandoId === usuario.id || usuario.id === auth.usuario?.id"
                    :aria-label="`Papel de ${usuario.nome}`"
                    class="min-h-9 rounded-control border border-border bg-surface px-2.5 text-xs font-medium capitalize text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-55"
                    @change="selecionarPapel(usuario, $event)"
                  >
                    <option v-for="papel in papeis" :key="papel" :value="papel">{{ papel }}</option>
                  </select>
                </td>
                <td class="border-b border-border/70 px-5 py-4">
                  <UiBadge :tone="usuario.ativo ? 'success' : 'warning'" dot>{{ usuario.ativo ? 'Ativo' : 'Pendente' }}</UiBadge>
                </td>
                <td class="border-b border-border/70 px-5 py-4">
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      role="switch"
                      :aria-checked="usuario.ativo"
                      :aria-label="`${usuario.ativo ? 'Desativar' : 'Ativar'} acesso de ${usuario.nome}`"
                      :disabled="atualizandoId === usuario.id || usuario.id === auth.usuario?.id"
                      class="interactive relative h-6 w-11 rounded-full disabled:cursor-not-allowed disabled:opacity-50"
                      :class="usuario.ativo ? 'bg-success' : 'bg-surface-muted'"
                      @click="alternarAtivo(usuario)"
                    ><span class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-surface shadow-sm transition-transform" :class="usuario.ativo ? 'translate-x-5' : 'translate-x-0'" /></button>
                    <span class="text-xs font-medium text-foreground-muted">{{ usuario.ativo ? 'Liberado' : 'Bloqueado' }}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="divide-y divide-border sm:hidden">
          <article v-for="usuario in usuariosFiltrados" :key="usuario.id" class="space-y-4 p-4">
            <div class="flex items-center gap-3">
              <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-info-surface text-xs font-bold text-info">{{ iniciais(usuario.nome) }}</span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold">{{ usuario.nome }} <span v-if="usuario.id === auth.usuario?.id" class="text-[10px] text-foreground-subtle">(você)</span></p>
                <p class="mt-0.5 truncate text-xs text-foreground-muted">{{ usuario.email }}</p>
              </div>
              <UiBadge :tone="usuario.ativo ? 'success' : 'warning'" dot>{{ usuario.ativo ? 'Ativo' : 'Pendente' }}</UiBadge>
            </div>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="text-[10px] font-semibold uppercase tracking-wide text-foreground-subtle">Setor</p>
                <p class="mt-1 truncate text-xs font-medium">{{ usuario.setor }}</p>
              </div>
              <select
                :value="usuario.papel"
                :disabled="atualizandoId === usuario.id || usuario.id === auth.usuario?.id"
                :aria-label="`Papel de ${usuario.nome}`"
                class="min-h-9 rounded-control border border-border bg-surface px-2.5 text-xs font-medium capitalize text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-55"
                @change="selecionarPapel(usuario, $event)"
              >
                <option v-for="papel in papeis" :key="papel" :value="papel">{{ papel }}</option>
              </select>
            </div>
            <div class="flex items-center justify-between border-t border-border pt-3">
              <span class="text-xs text-foreground-muted">Acesso ao sistema</span>
              <button
                type="button"
                role="switch"
                :aria-checked="usuario.ativo"
                :aria-label="`${usuario.ativo ? 'Desativar' : 'Ativar'} acesso de ${usuario.nome}`"
                :disabled="atualizandoId === usuario.id || usuario.id === auth.usuario?.id"
                class="interactive relative h-6 w-11 rounded-full disabled:cursor-not-allowed disabled:opacity-50"
                :class="usuario.ativo ? 'bg-success' : 'bg-surface-muted'"
                @click="alternarAtivo(usuario)"
              ><span class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-surface shadow-sm transition-transform" :class="usuario.ativo ? 'translate-x-5' : 'translate-x-0'" /></button>
            </div>
          </article>
        </div>
      </div>
    </section>

    <UiToast v-model="sucesso" title="Alteração salva" :description="sucessoMensagem" tone="success" />
  </AppShell>
</template>
