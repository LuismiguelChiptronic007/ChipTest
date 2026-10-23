<script setup lang="ts">
import { novaSenhaSchema } from '@backend/schemas/auth'
import { z } from 'zod'

const route = useRoute()
const senha = ref('')
const confirmarSenha = ref('')
const erro = ref('')
const sucesso = ref('')
const carregando = ref(false)

async function redefinirSenha() {
  erro.value = ''
  sucesso.value = ''
  const validacao = novaSenhaSchema.safeParse({
    senha: senha.value,
    confirmarSenha: confirmarSenha.value,
  })
  if (!validacao.success) {
    erro.value = validacao.error.issues[0]?.message ?? 'Confira os dados informados.'
    return
  }

  const token = z.string().min(40).max(100).safeParse(route.query.token)
  if (!token.success) {
    erro.value = 'O link de redefinição é inválido. Solicite um novo e-mail.'
    return
  }

  carregando.value = true
  try {
    await $fetch('/api/auth/senha', {
      method: 'POST',
      body: { ...validacao.data, token: token.data },
    })

    sucesso.value = 'Senha atualizada. Você já pode entrar com a nova senha.'
    senha.value = ''
    confirmarSenha.value = ''
  } catch (error: unknown) {
    erro.value = mensagemDeErro(error, 'Não foi possível atualizar a senha. Tente novamente.')
  } finally {
    carregando.value = false
  }
}
</script>

<template>
  <AuthLayout>
    <div class="mb-7">
      <p class="text-xs font-bold uppercase tracking-[0.14em] text-primary">Segurança da conta</p>
      <h1 class="mt-2 text-3xl font-bold tracking-[-0.035em]">Defina uma nova senha</h1>
      <p class="mt-2 text-sm leading-6 text-foreground-muted">Escolha uma senha segura para proteger seu acesso.</p>
    </div>
    <AppAlert v-if="erro" tone="error" class="mb-5">{{ erro }}</AppAlert>
    <AppAlert v-if="sucesso" tone="success" class="mb-5">{{ sucesso }}</AppAlert>
    <form class="space-y-5" @submit.prevent="redefinirSenha">
      <UiField id="senha" v-model="senha" label="Nova senha" type="password" autocomplete="new-password" required revealable hint="Mínimo de 8 caracteres, com maiúscula, minúscula e número." />
      <UiField id="confirmar-senha" v-model="confirmarSenha" label="Confirmar nova senha" type="password" autocomplete="new-password" required revealable />
      <UiButton type="submit" variant="primary" size="lg" class="w-full" :loading="carregando">
        {{ carregando ? 'Salvando...' : 'Salvar nova senha' }}
      </UiButton>
    </form>
    <p class="mt-7 border-t border-border pt-5 text-center text-sm">
      <NuxtLink to="/login" class="font-semibold text-primary hover:text-primary-hover">Voltar ao login</NuxtLink>
    </p>
  </AuthLayout>
</template>
