<script setup lang="ts">
import { cadastroSchema } from '@backend/schemas/auth'
import { z } from 'zod'
import type { Setor } from '~/types/auth'

const setores = ref<Setor[]>([])
const nome = ref('')
const email = ref('')
const setorId = ref('')
const senha = ref('')
const confirmarSenha = ref('')
const erro = ref('')
const sucesso = ref('')
const carregando = ref(false)
const carregandoSetores = ref(true)
const opcoesSetor = computed(() => [
  { label: 'Selecione seu setor', value: '' },
  ...setores.value.map((setor: Setor) => ({ label: setor.nome, value: setor.id })),
])

onMounted(async () => {
  try {
    const resposta = await $fetch<{ setores: unknown }>('/api/setores')
    const validacao = z.array(z.object({ id: z.string().uuid(), nome: z.string() })).safeParse(resposta.setores)
    if (!validacao.success) {
      erro.value = 'A lista de setores recebida do servidor está inválida.'
      return
    }

    setores.value = validacao.data
  } catch {
    erro.value = 'Não foi possível carregar os setores. Atualize a página ou tente novamente.'
  } finally {
    carregandoSetores.value = false
  }
})

async function cadastrar() {
  erro.value = ''
  sucesso.value = ''
  const validacao = cadastroSchema.safeParse({
    nome: nome.value,
    email: email.value,
    setorId: setorId.value,
    senha: senha.value,
    confirmarSenha: confirmarSenha.value,
  })
  if (!validacao.success) {
    erro.value = validacao.error.issues[0]?.message ?? 'Confira os dados informados.'
    return
  }

  carregando.value = true
  try {
    await $fetch('/api/auth/cadastro', {
      method: 'POST',
      body: validacao.data,
    })
    sucesso.value = 'Conta criada. Entre com seu e-mail e senha; seu acesso ficará disponível após a liberação do administrador.'
  } catch (error: unknown) {
    erro.value = mensagemDeErro(error, 'Não foi possível criar a conta. Tente novamente.')
  } finally {
    carregando.value = false
  }
}
</script>

<template>
  <AuthLayout>
    <div class="mb-6">
      <p class="text-xs font-bold uppercase tracking-[0.14em] text-primary">Solicitação de acesso</p>
      <h2 class="mt-2 text-3xl font-bold tracking-[-0.035em]">Crie sua conta</h2>
      <p class="mt-2 text-sm leading-6 text-foreground-muted">Preencha seus dados. Um administrador libera o acesso após a análise.</p>
    </div>

    <AppAlert v-if="erro" tone="error" class="mb-4">{{ erro }}</AppAlert>
    <AppAlert v-if="sucesso" tone="success" class="mb-4">{{ sucesso }}</AppAlert>

    <form class="space-y-4" @submit.prevent="cadastrar">
      <UiField id="nome" v-model="nome" label="Nome completo" autocomplete="name" required maxlength="120" placeholder="Seu nome" />
      <UiField id="email" v-model="email" label="E-mail corporativo" type="email" autocomplete="email" required maxlength="254" placeholder="nome@empresa.com" />
      <UiSelect id="setor" v-model="setorId" label="Setor" :options="opcoesSetor" required :disabled="carregandoSetores || setores.length === 0" :hint="carregandoSetores ? 'Carregando setores...' : undefined" />
      <UiField id="senha" v-model="senha" label="Senha" type="password" autocomplete="new-password" required revealable hint="Mínimo de 8 caracteres, com maiúscula, minúscula e número." />
      <UiField id="confirmar-senha" v-model="confirmarSenha" label="Confirmar senha" type="password" autocomplete="new-password" required revealable />
      <UiButton type="submit" variant="primary" size="lg" class="w-full" :loading="carregando" :disabled="carregandoSetores || setores.length === 0">
        {{ carregando ? 'Criando conta...' : 'Criar conta' }}
      </UiButton>
    </form>

    <p class="mt-6 border-t border-border pt-5 text-center text-sm text-foreground-muted">
      Já tem uma conta?
      <NuxtLink to="/login" class="font-semibold text-primary hover:text-primary-hover">Entrar</NuxtLink>
    </p>
  </AuthLayout>
</template>
