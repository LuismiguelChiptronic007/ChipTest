<script setup lang="ts">
import { ShieldAlert } from '@lucide/vue'

const auth = useAuthStore()
const erro = ref('')
const carregando = ref(false)

async function sair() {
  erro.value = ''
  carregando.value = true
  try {
    await $fetch('/api/auth/sessao', { method: 'DELETE' })
    auth.limpar()
    await navigateTo('/login')
  } catch (error: unknown) {
    erro.value = mensagemDeErro(error, 'Não foi possível encerrar a sessão. Tente novamente.')
  } finally {
    carregando.value = false
  }
}
</script>

<template>
  <AuthLayout>
    <section class="surface-card p-6 text-center sm:p-8">
      <span class="mx-auto grid h-14 w-14 place-items-center rounded-full bg-warning-surface text-warning">
        <ShieldAlert :size="24" aria-hidden="true" />
      </span>
      <p class="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-warning">Acesso pendente</p>
      <h1 class="mt-2 text-2xl font-bold tracking-[-0.035em]">Aguardando liberação</h1>
      <p class="mt-3 text-sm leading-6 text-foreground-muted">
        {{ auth.perfil?.nome ? `Olá, ${auth.perfil.nome}.` : 'Sua conta foi criada.' }}
        Um administrador precisa liberar seu acesso antes de você usar o sistema.
      </p>
      <AppAlert v-if="erro" tone="error" class="mt-5 text-left">{{ erro }}</AppAlert>
      <UiButton variant="secondary" class="mt-6 w-full" :loading="carregando" @click="sair">
        {{ carregando ? 'Encerrando sessão...' : 'Sair da conta' }}
      </UiButton>
      <p class="mt-4 text-xs text-foreground-subtle">Você pode entrar novamente após receber a confirmação.</p>
    </section>
  </AuthLayout>
</template>
