<script setup lang="ts">
import { novaSenhaSchema } from '@backend/schemas/auth'

const auth = useAuthStore()
const senha = ref('')
const confirmarSenha = ref('')
const erro = ref('')
const sucesso = ref('')
const carregando = ref(false)

async function alterarSenha() {
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

  carregando.value = true
  try {
    await $fetch('/api/perfil/senha', {
      method: 'PUT',
      body: validacao.data,
    })

    senha.value = ''
    confirmarSenha.value = ''
    sucesso.value = 'Senha alterada com sucesso.'
  } catch (error: unknown) {
    erro.value = mensagemDeErro(error, 'Não foi possível alterar a senha. Tente novamente.')
  } finally {
    carregando.value = false
  }
}

</script>

<template>
  <AppShell title="Meu perfil" description="Consulte seus dados de acesso e mantenha sua senha atualizada.">
    <template #actions><UiBadge tone="info">{{ auth.perfil?.papel }}</UiBadge></template>

    <AppAlert v-if="erro" tone="error" class="mb-5">{{ erro }}</AppAlert>
    <AppAlert v-if="sucesso" tone="success" class="mb-5">{{ sucesso }}</AppAlert>

    <div class="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
      <UiCard>
        <div class="flex items-center gap-4 border-b border-border pb-5">
          <span class="grid h-12 w-12 place-items-center rounded-full bg-info-surface text-sm font-bold text-info">
            {{ auth.perfil?.nome.split(/\s+/).slice(0, 2).map((parte: string) => parte[0]).join('').toLocaleUpperCase('pt-BR') }}
          </span>
          <div class="min-w-0">
            <h2 class="truncate text-base font-bold">{{ auth.perfil?.nome }}</h2>
            <p class="mt-1 truncate text-sm text-foreground-muted">{{ auth.usuario?.email }}</p>
          </div>
        </div>
        <dl class="mt-1 divide-y divide-border">
          <div class="flex items-center justify-between gap-5 py-4">
            <dt class="text-sm text-foreground-muted">Setor</dt>
            <dd class="text-right text-sm font-semibold">{{ auth.perfil?.setor }}</dd>
          </div>
          <div class="flex items-center justify-between gap-5 py-4">
            <dt class="text-sm text-foreground-muted">Papel</dt>
            <dd><UiBadge tone="info">{{ auth.perfil?.papel }}</UiBadge></dd>
          </div>
          <div class="flex items-center justify-between gap-5 py-4">
            <dt class="text-sm text-foreground-muted">Status da conta</dt>
            <dd><UiBadge tone="success" dot>Ativa</UiBadge></dd>
          </div>
        </dl>
      </UiCard>

      <UiCard>
        <div>
          <h2 class="text-base font-bold">Alterar senha</h2>
          <p class="mt-1 text-sm text-foreground-muted">Use uma senha forte e exclusiva para sua conta.</p>
        </div>
        <form class="mt-5 space-y-4" @submit.prevent="alterarSenha">
          <UiField id="senha" v-model="senha" label="Nova senha" type="password" autocomplete="new-password" required revealable hint="Mínimo de 8 caracteres, com maiúscula, minúscula e número." />
          <UiField id="confirmar-senha" v-model="confirmarSenha" label="Confirmar nova senha" type="password" autocomplete="new-password" required revealable />
          <UiButton type="submit" variant="primary" :loading="carregando">{{ carregando ? 'Salvando...' : 'Atualizar senha' }}</UiButton>
        </form>
      </UiCard>
    </div>
  </AppShell>
</template>
