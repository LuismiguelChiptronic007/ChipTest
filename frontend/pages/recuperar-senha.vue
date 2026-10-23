<script setup lang="ts">
import { emailSchema } from '@backend/schemas/auth'

const email = ref('')
const erro = ref('')
const sucesso = ref('')
const carregando = ref(false)

async function enviarLink() {
  erro.value = ''
  sucesso.value = ''
  const validacao = emailSchema.safeParse({ email: email.value })
  if (!validacao.success) {
    erro.value = validacao.error.issues[0]?.message ?? 'Informe um e-mail válido.'
    return
  }

  carregando.value = true
  try {
    const resposta = await $fetch<{ mensagem: string }>('/api/auth/recuperar-senha', {
      method: 'POST',
      body: validacao.data,
    })
    sucesso.value = resposta.mensagem
  } catch (error: unknown) {
    erro.value = mensagemDeErro(error, 'Não foi possível enviar o link. Tente novamente.')
  } finally {
    carregando.value = false
  }
}
</script>

<template>
  <AuthLayout>
    <div class="mb-7">
      <p class="text-xs font-bold uppercase tracking-[0.14em] text-primary">Recuperação de acesso</p>
      <h1 class="mt-2 text-3xl font-bold tracking-[-0.035em]">Recuperar senha</h1>
      <p class="mt-2 text-sm leading-6 text-foreground-muted">Enviaremos um link seguro para o endereço associado à sua conta.</p>
    </div>
    <AppAlert v-if="erro" tone="error" class="mb-5">{{ erro }}</AppAlert>
    <AppAlert v-if="sucesso" tone="success" class="mb-5">{{ sucesso }}</AppAlert>
    <form class="space-y-5" @submit.prevent="enviarLink">
      <UiField id="email" v-model="email" label="E-mail" type="email" autocomplete="email" required placeholder="nome@empresa.com" />
      <UiButton type="submit" variant="primary" size="lg" class="w-full" :loading="carregando">
        {{ carregando ? 'Enviando...' : 'Enviar link de redefinição' }}
      </UiButton>
    </form>
    <p class="mt-7 border-t border-border pt-5 text-center text-sm">
      <NuxtLink to="/login" class="font-semibold text-primary hover:text-primary-hover">Voltar ao login</NuxtLink>
    </p>
  </AuthLayout>
</template>
