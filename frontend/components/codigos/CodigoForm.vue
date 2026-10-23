<script setup lang="ts">
import { ArrowLeft, CarFront, FileText, Save, ShieldCheck } from '@lucide/vue'
import { codigoSchema } from '@backend/schemas/codigos'
import { z } from 'zod'

const props = withDefaults(defineProps<{
  codigoId?: string
}>(), {
  codigoId: '',
})

const form = reactive({
  codigo: '',
  
  marca: '',
  modelo: '',
  motor: '',
  ano: '',
  observacoes: '',
})
const carregando = ref(Boolean(props.codigoId))
const salvando = ref(false)
const erro = ref('')
const snapshotInicial = ref('')

const editando = computed(() => Boolean(props.codigoId))
const snapshotAtual = computed(() => JSON.stringify(form))
const alterado = computed(() => snapshotInicial.value !== '' && snapshotInicial.value !== snapshotAtual.value)

function capturarSnapshot() {
  snapshotInicial.value = snapshotAtual.value
}

async function carregarCodigo() {
  if (!props.codigoId) {
    capturarSnapshot()
    return
  }

  carregando.value = true
  erro.value = ''
  try {
    const resposta = await $fetch<{ codigo: Record<string, unknown> }>(`/api/codigos/${props.codigoId}`)
    const dados = z.object({
      codigo: z.string(),
      marca: z.string(),
      modelo: z.string(),
      motor: z.string().nullable(),
      ano: z.number().nullable(),
      observacoes: z.string().nullable(),
    }).parse(resposta.codigo)
    Object.assign(form, {
      codigo: dados.codigo,
      marca: dados.marca,
      modelo: dados.modelo,
      motor: dados.motor ?? '',
      ano: dados.ano === null ? '' : String(dados.ano),
      observacoes: dados.observacoes ?? '',
    })
    capturarSnapshot()
  } catch (error: unknown) {
    erro.value = mensagemDeErro(error, 'Não foi possível carregar o código para edição.')
  } finally {
    carregando.value = false
  }
}

async function salvar() {
  erro.value = ''
  const validacao = codigoSchema.safeParse({
    codigo: form.codigo,
    marca: form.marca,
    modelo: form.modelo,
    motor: form.motor,
    ano: form.ano,
    observacoes: form.observacoes,
  })
  if (!validacao.success) {
    erro.value = validacao.error.issues[0]?.message ?? 'Confira os dados informados.'
    return
  }

  salvando.value = true
  try {
    let id = props.codigoId
    if (editando.value) {
      await $fetch(`/api/codigos/${props.codigoId}`, { method: 'put', body: validacao.data })
    } else {
      const resultado = await $fetch<{ id: string }>('/api/codigos', { method: 'POST', body: validacao.data })
      id = resultado.id
    }
    capturarSnapshot()
    await navigateTo({
      path: `/codigos/${id}`,
      query: { salvo: editando.value ? 'edicao' : 'novo' },
    })
  } catch (error: unknown) {
    erro.value = mensagemDeErro(error, 'Não foi possível salvar o código.')
  } finally {
    salvando.value = false
  }
}

function confirmarSaida() {
  if (!alterado.value) return true
  return window.confirm('Há alterações não salvas. Deseja sair sem salvar?')
}

onBeforeRouteLeave(() => confirmarSaida())

function antesDeFechar(event: BeforeUnloadEvent) {
  if (!alterado.value) return
  event.preventDefault()
  event.returnValue = ''
}

onMounted(() => {
  window.addEventListener('beforeunload', antesDeFechar)
  void carregarCodigo()
})

onBeforeUnmount(() => window.removeEventListener('beforeunload', antesDeFechar))
</script>

<template>
  <AppShell
    :title="editando ? 'Editar código' : 'Novo código'"
    :description="editando ? 'Atualize as informações técnicas e os detalhes do veículo.' : 'Cadastre um veículo e vincule as informações técnicas ao seu código.'"
  >
    <template #actions>
      <UiBadge v-if="alterado" tone="warning" dot>Alterações não salvas</UiBadge>
      <UiBadge v-else-if="editando" tone="neutral">Edição</UiBadge>
    </template>

    <div v-if="carregando" class="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
      <UiCard><UiSkeleton variant="heading" /><div class="mt-6 space-y-5"><UiSkeleton v-for="linha in 5" :key="linha" variant="block" /></div></UiCard>
      <UiCard><UiSkeleton variant="heading" /><div class="mt-5"><UiSkeleton variant="block" /></div></UiCard>
    </div>
    <AppAlert v-else-if="erro && editando && !snapshotInicial" tone="error" class="max-w-3xl">{{ erro }}</AppAlert>
    <template v-else>
      <AppAlert v-if="erro" tone="error" class="mb-5">{{ erro }}</AppAlert>
      <div class="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.75fr)]">
        <form class="space-y-5" @submit.prevent="salvar">
          <UiCard>
            <div class="flex items-start gap-3 border-b border-border pb-4">
              <span class="grid h-9 w-9 shrink-0 place-items-center rounded-control bg-info-surface text-info"><CarFront :size="17" aria-hidden="true" /></span>
              <div>
                <h2 class="text-sm font-bold">Identificação do veículo</h2>
                <p class="mt-1 text-xs text-foreground-muted">Informações essenciais para localizar e diferenciar este cadastro.</p>
              </div>
            </div>
            <div class="mt-5 grid gap-4 sm:grid-cols-2">
              <UiField id="codigo" v-model="form.codigo" label="Código do veículo" required maxlength="80" placeholder="Ex.: CT-2048" hint="O código é único e será exibido em fonte técnica." />
              <UiField id="marca" v-model="form.marca" label="Marca" required maxlength="80" placeholder="Ex.: Volkswagen" />
              <UiField id="modelo" v-model="form.modelo" label="Modelo" required maxlength="80" placeholder="Ex.: Golf GTI" />
              <UiField id="motor" v-model="form.motor" label="Motor" maxlength="120" placeholder="Ex.: 2.0 TSI EA888" />
              <UiField id="ano" v-model="form.ano" label="Ano do modelo" type="number" min="1886" max="2200" inputmode="numeric" placeholder="Ex.: 2024" />
            </div>
          </UiCard>

          <UiCard>
            <div class="flex items-start gap-3 border-b border-border pb-4">
              <span class="grid h-9 w-9 shrink-0 place-items-center rounded-control bg-surface-raised text-foreground-muted"><FileText :size="17" aria-hidden="true" /></span>
              <div>
                <h2 class="text-sm font-bold">Observações técnicas</h2>
                <p class="mt-1 text-xs text-foreground-muted">Registre detalhes úteis para engenharia e validação.</p>
              </div>
            </div>
            <div class="mt-5">
              <label for="observacoes" class="mb-2 block text-sm font-semibold text-foreground">Observações <span class="font-normal text-foreground-subtle">(opcional)</span></label>
              <textarea id="observacoes" v-model="form.observacoes" rows="5" maxlength="5000" placeholder="Adicione informações relevantes sobre a aplicação, configuração ou preparação do veículo." class="interactive w-full resize-y rounded-control border border-border bg-surface px-3.5 py-3 text-sm leading-6 text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" />
              <p class="mt-1.5 text-right text-[11px] text-foreground-subtle">{{ form.observacoes.length }} / 5.000</p>
            </div>
          </UiCard>

          <div class="flex flex-wrap items-center justify-between gap-3">
            <NuxtLink to="/codigos" class="interactive inline-flex min-h-10 items-center gap-2 rounded-control px-3 text-sm font-semibold text-foreground-muted hover:bg-surface-muted hover:text-foreground"><ArrowLeft :size="16" aria-hidden="true" /> Voltar aos códigos</NuxtLink>
            <UiButton type="submit" variant="primary" :loading="salvando"><template #icon><Save :size="16" aria-hidden="true" /></template>{{ salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Cadastrar código' }}</UiButton>
          </div>
        </form>

        <aside class="space-y-4">
          <UiCard padding="compact">
            <div class="flex items-center gap-3">
              <span class="grid h-9 w-9 place-items-center rounded-control bg-success-surface text-success"><ShieldCheck :size="17" aria-hidden="true" /></span>
              <div><h2 class="text-xs font-bold">Cadastro consistente</h2><p class="mt-1 text-[11px] text-foreground-muted">Validação e histórico automáticos</p></div>
            </div>
            <ul class="mt-4 space-y-2 border-t border-border pt-4 text-xs leading-5 text-foreground-muted">
              <li>O código deve ser exclusivo no catálogo.</li>
              <li>Alterações ficam registradas no histórico.</li>
              <li>O motor, ano e observações são opcionais.</li>
            </ul>
          </UiCard>
          <UiCard v-if="editando" padding="compact">
            <h2 class="text-xs font-bold">Acesso por perfil</h2>
            <p class="mt-2 text-xs leading-5 text-foreground-muted">Administração e engenharia podem editar os dados. Bancada e campo têm acesso de consulta.</p>
          </UiCard>
        </aside>
      </div>
    </template>

  </AppShell>
</template>
