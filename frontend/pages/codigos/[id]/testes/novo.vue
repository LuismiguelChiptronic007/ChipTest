<script setup lang="ts">
import { ArrowLeft, ClipboardCheck, MapPin, UserRound } from '@lucide/vue'
import { z } from 'zod'

const route = useRoute()
const auth = useAuth()
const codigoId = computed(() => String(route.params.id))
const carregando = ref(true)
const salvando = ref(false)
const erro = ref('')
const tipo = ref<'bancada' | 'campo'>('bancada')
const responsavelId = ref('')
const veiculoInfo = ref('')
const observacoes = ref('')
const sugestoes = ref({ bancada: 1, campo: 1 })
const codigo = ref<{ id: string; codigo: string; marca: string; modelo: string } | null>(null)
const responsaveis = ref<Array<{ id: string; nome: string; papel: string; setor: string }>>([])

const respostaSchema = z.object({
  codigo: z.object({ id: z.string(), codigo: z.string(), marca: z.string(), modelo: z.string() }),
  sugestoes: z.object({ bancada: z.number().int().positive(), campo: z.number().int().positive() }),
  responsaveis: z.array(z.object({ id: z.string(), nome: z.string(), papel: z.string(), setor: z.string() })),
  responsavelPadrao: z.string(),
})

const numeroSugerido = computed(() => sugestoes.value[tipo.value])
const tipoPermitido = computed(() => {
  const papel = auth.papel.value
  return papel === 'admin' || papel === 'engenharia' || papel === tipo.value
})

async function carregar() {
  carregando.value = true
  erro.value = ''
  try {
    const resposta = respostaSchema.safeParse(await $fetch<unknown>(`/api/codigos/${codigoId.value}/testes/novo`))
    if (!resposta.success) throw new Error('As informações para iniciar o teste estão em formato inválido.')
    codigo.value = resposta.data.codigo
    sugestoes.value = resposta.data.sugestoes
    responsaveis.value = resposta.data.responsaveis
    responsavelId.value = resposta.data.responsavelPadrao
  } catch (error: unknown) {
    erro.value = mensagemDeErro(error, 'Não foi possível carregar os dados para o novo teste.')
  } finally {
    carregando.value = false
  }
}

async function criar() {
  if (!tipoPermitido.value) {
    erro.value = tipo.value === 'bancada'
      ? 'Seu perfil não pode iniciar testes de bancada.'
      : 'Seu perfil não pode iniciar testes de campo.'
    return
  }
  salvando.value = true
  erro.value = ''
  try {
    const resposta = await $fetch<{ id: string }>(`/api/codigos/${codigoId.value}/testes`, {
      method: 'POST',
      body: {
        tipo: tipo.value,
        responsavelId: responsavelId.value,
        veiculoInfo: veiculoInfo.value.trim() || null,
        observacoes: observacoes.value.trim() || null,
      },
    })
    await navigateTo(`/testes/${resposta.id}`)
  } catch (error: unknown) {
    erro.value = mensagemDeErro(error, 'Não foi possível iniciar o teste.')
  } finally {
    salvando.value = false
  }
}

onMounted(() => void carregar())
</script>

<template>
  <AppShell title="Novo teste" description="Inicie uma execução e gere o checklist a partir dos itens ativos do código.">
    <template #actions>
      <NuxtLink :to="`/codigos/${codigoId}`" class="interactive inline-flex min-h-9 items-center gap-2 rounded-control border border-border bg-surface px-3 text-xs font-semibold hover:bg-surface-raised">
        <ArrowLeft :size="14" aria-hidden="true" /> Voltar ao código
      </NuxtLink>
    </template>

    <AppAlert v-if="erro" tone="error" class="mb-5">{{ erro }}</AppAlert>
    <UiCard v-if="carregando"><UiSkeleton variant="heading" /><div class="mt-5"><UiSkeleton variant="block" /></div></UiCard>
    <div v-else-if="codigo" class="mx-auto max-w-3xl space-y-5">
      <section class="surface-card p-5 sm:p-6">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <p class="font-mono text-lg font-bold text-primary">{{ codigo.codigo }}</p>
            <h2 class="mt-1 text-sm font-semibold">{{ codigo.marca }} {{ codigo.modelo }}</h2>
          </div>
          <UiBadge tone="neutral"><ClipboardCheck :size="14" aria-hidden="true" /> Checklist individual por item</UiBadge>
        </div>

        <form class="mt-5 space-y-5" @submit.prevent="criar">
          <fieldset class="space-y-2">
            <legend class="mb-2 text-sm font-semibold">Tipo de teste</legend>
            <div class="grid gap-3 sm:grid-cols-2">
              <label
                v-for="opcao in [{ id: 'bancada', titulo: 'Teste de bancada', texto: 'Validação em ambiente controlado.' }, { id: 'campo', titulo: 'Teste de campo', texto: 'Validação durante uso no veículo.' }]"
                :key="opcao.id"
                class="interactive flex cursor-pointer items-start gap-3 rounded-card border p-4"
                :class="tipo === opcao.id ? 'border-primary bg-info-surface' : 'border-border bg-surface hover:bg-surface-raised'"
              >
                <input v-model="tipo" class="mt-1 accent-primary" type="radio" :value="opcao.id" :disabled="auth.papel !== 'admin' && auth.papel !== 'engenharia' && auth.papel !== opcao.id">
                <span>
                  <span class="block text-sm font-semibold">{{ opcao.titulo }}</span>
                  <span class="mt-1 block text-xs text-foreground-muted">{{ opcao.texto }}</span>
                  <span class="mt-2 block text-[11px] font-medium text-foreground-subtle">Próximo número: <span class="font-mono text-foreground">{{ sugestoes[opcao.id as 'bancada' | 'campo'] }}</span></span>
                </span>
              </label>
            </div>
          </fieldset>

          <label class="block space-y-2">
            <span class="flex items-center gap-2 text-sm font-semibold"><UserRound :size="15" aria-hidden="true" /> Responsável</span>
            <select v-model="responsavelId" class="interactive min-h-11 w-full rounded-control border border-border bg-surface px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15">
              <option v-for="pessoa in responsaveis" :key="pessoa.id" :value="pessoa.id">{{ pessoa.nome }} · {{ pessoa.setor }}</option>
            </select>
            <span class="block text-xs text-foreground-muted">Por padrão, selecionamos seu usuário. O responsável pode ser ajustado antes de iniciar.</span>
          </label>

          <label class="block space-y-2">
            <span class="flex items-center gap-2 text-sm font-semibold"><MapPin :size="15" aria-hidden="true" /> Identificação do veículo <span class="font-normal text-foreground-subtle">(opcional)</span></span>
            <input v-model="veiculoInfo" maxlength="500" placeholder="Placa, chassi, local de teste..." class="interactive min-h-11 w-full rounded-control border border-border bg-surface px-3 text-sm placeholder:text-foreground-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15">
          </label>

          <label class="block space-y-2">
            <span class="text-sm font-semibold">Observações iniciais <span class="font-normal text-foreground-subtle">(opcional)</span></span>
            <textarea v-model="observacoes" rows="4" maxlength="5000" placeholder="Contexto ou condições iniciais do teste..." class="interactive w-full rounded-control border border-border bg-surface px-3 py-2.5 text-sm placeholder:text-foreground-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" />
          </label>

          <div class="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p class="text-xs text-foreground-muted">Os itens serão copiados como snapshot. Alterações futuras na importação não modificam este checklist.</p>
            <UiButton type="submit" variant="primary" :loading="salvando" :disabled="!tipoPermitido || !responsavelId">
              <template #icon><ClipboardCheck :size="15" aria-hidden="true" /></template>
              Iniciar teste nº {{ numeroSugerido }}
            </UiButton>
          </div>
        </form>
      </section>
    </div>
  </AppShell>
</template>
