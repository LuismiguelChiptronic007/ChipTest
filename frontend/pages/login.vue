<script setup lang="ts">
import { loginSchema } from '@backend/schemas/auth'

const auth = useAuthStore()
const email = ref('')
const senha = ref('')
const erro = ref('')
const carregando = ref(false)

async function entrar() {
  erro.value = ''
  const validacao = loginSchema.safeParse({ email: email.value, senha: senha.value })
  if (!validacao.success) {
    erro.value = validacao.error.issues[0]?.message ?? 'Confira os dados informados.'
    return
  }

  carregando.value = true
  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: validacao.data,
    })

    await auth.recarregar()
    await navigateTo(auth.perfil?.ativo ? '/painel' : '/aguardando-liberacao')
  } catch (error: unknown) {
    erro.value = mensagemDeErro(error, 'Não foi possível entrar. Tente novamente.')
  } finally {
    carregando.value = false
  }
}
</script>

<template>
  <AuthLayout>
    <div class="mb-7">
      <p class="text-xs font-bold uppercase tracking-[0.14em] text-primary">Acesso ao sistema</p>
      <h2 class="mt-2 text-3xl font-bold tracking-[-0.035em]">Acesse sua conta</h2>
      <p class="mt-2 text-sm leading-6 text-foreground-muted">Entre para continuar no ambiente de testes da Chiptronic.</p>
    </div>

    <AppAlert v-if="erro" tone="error" class="mb-5">{{ erro }}</AppAlert>

    <form class="space-y-5" @submit.prevent="entrar">
      <UiField id="email" v-model="email" label="E-mail" type="email" autocomplete="email" required placeholder="nome@empresa.com" />
      <UiField id="senha" v-model="senha" label="Senha" type="password" autocomplete="current-password" required revealable placeholder="Digite sua senha" />
      <div class="-mt-3 flex justify-end">
        <NuxtLink to="/recuperar-senha" class="text-xs font-semibold text-primary hover:text-primary-hover">Esqueci minha senha</NuxtLink>
      </div>
      <UiButton type="submit" variant="primary" size="lg" class="w-full" :loading="carregando">{{ carregando ? 'Entrando...' : 'Entrar' }}</UiButton>
    </form>

    <p class="mt-7 border-t border-border pt-5 text-center text-sm text-foreground-muted">
      Ainda não tem acesso?
      <NuxtLink to="/cadastro" class="font-semibold text-primary hover:text-primary-hover">Solicitar acesso</NuxtLink>
    </p>
  </AuthLayout>
</template>
