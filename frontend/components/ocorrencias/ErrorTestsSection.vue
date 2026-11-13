<script setup lang="ts">
import { ChevronDown, ChevronUp, Plus } from '@lucide/vue'
import type { ErrorTest, ErrorTestInput, ErrorTestKind, ErrorTestStatus } from '../../composables/useErrorTests'
import { useErrorTests } from '../../composables/useErrorTests'
import ErrorTestCard from './ErrorTestCard.vue'
import ErrorTestForm from './ErrorTestForm.vue'
import ErrorTestTabs from './ErrorTestTabs.vue'

const props = defineProps<{
  ocorrenciaId: string
  responsaveis: Array<{ id: string; nome: string }>
}>()

const auth = useAuth()
const {
  abaAtiva,
  alterarStatus,
  carregar,
  carregando,
  contagens,
  criar,
  editar,
  erro,
  excluir,
  excluirAnexo,
  expandirAtivos,
  idsAbertos,
  selecionarAba,
  testesAtivos,
  alternarTeste,
  recolherAtivos,
  enviarAnexo,
} = useErrorTests(() => props.ocorrenciaId)

const modalAberto = ref(false)
const testeEditando = ref<ErrorTest | null>(null)
const salvando = ref(false)
const uploadingTestId = ref('')
const removingAttachmentId = ref('')

function podeGerenciar(kind: ErrorTestKind) {
  return auth.papel.value === 'admin'
    || auth.papel.value === 'engenharia'
    || auth.papel.value === kind
}

function novoTeste(kind = abaAtiva.value) {
  if (!podeGerenciar(kind)) return
  testeEditando.value = null
  modalAberto.value = true
}

function editarTeste(teste: ErrorTest) {
  testeEditando.value = teste
  modalAberto.value = true
}

async function salvar(input: ErrorTestInput) {
  salvando.value = true
  erro.value = ''
  try {
    if (testeEditando.value) {
      await editar(testeEditando.value.id, input)
    } else {
      await criar(input)
    }
    modalAberto.value = false
    testeEditando.value = null
  } catch (cause: unknown) {
    erro.value = mensagemDeErro(cause, 'Não foi possível salvar o teste.')
  } finally {
    salvando.value = false
  }
}

async function excluirTeste(teste: ErrorTest) {
  if (!window.confirm(`Excluir ${teste.kind} ${String(teste.sequence).padStart(2, '0')} e seus arquivos?`)) return
  erro.value = ''
  try {
    await excluir(teste.id)
  } catch (cause: unknown) {
    erro.value = mensagemDeErro(cause, 'Não foi possível excluir o teste.')
  }
}

async function atualizarStatus(teste: ErrorTest, status: ErrorTestStatus) {
  erro.value = ''
  try {
    await alterarStatus(teste.id, status)
  } catch (cause: unknown) {
    erro.value = mensagemDeErro(cause, 'Não foi possível alterar o status do teste.')
  }
}

async function anexarArquivo(teste: ErrorTest, file: File) {
  uploadingTestId.value = teste.id
  erro.value = ''
  try {
    await enviarAnexo(teste.id, file)
  } catch (cause: unknown) {
    erro.value = mensagemDeErro(cause, 'Não foi possível adicionar o arquivo.')
  } finally {
    uploadingTestId.value = ''
  }
}

async function removerAnexo(testeId: string, attachmentId: string, fileName: string) {
  if (!window.confirm(`Remover o arquivo “${fileName}”?`)) return
  removingAttachmentId.value = attachmentId
  erro.value = ''
  try {
    await excluirAnexo(testeId, attachmentId)
  } catch (cause: unknown) {
    erro.value = mensagemDeErro(cause, 'Não foi possível remover o arquivo.')
  } finally {
    removingAttachmentId.value = ''
  }
}
</script>

<template>
  <section class="surface-card p-4 sm:p-5" aria-labelledby="error-tests-title">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 id="error-tests-title" class="text-base font-bold">Testes</h2>
      <UiButton v-if="podeGerenciar(abaAtiva)" variant="primary" size="sm" @click="novoTeste()">
        <template #icon><Plus :size="15" aria-hidden="true" /></template>Novo teste
      </UiButton>
    </div>

    <div class="mt-4">
      <ErrorTestTabs :model-value="abaAtiva" :counts="contagens" @update:model-value="selecionarAba" />
    </div>

    <div class="flex flex-wrap items-center justify-end gap-2 pt-3">
      <UiButton variant="ghost" size="sm" :disabled="carregando || !testesAtivos.length" @click="expandirAtivos">
        <template #icon><ChevronDown :size="14" aria-hidden="true" /></template>Expandir todos
      </UiButton>
      <UiButton variant="ghost" size="sm" :disabled="carregando || !testesAtivos.length" @click="recolherAtivos">
        <template #icon><ChevronUp :size="14" aria-hidden="true" /></template>Recolher todos
      </UiButton>
    </div>

    <AppAlert v-if="erro" tone="error" class="mt-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <span>{{ erro }}</span>
        <UiButton variant="secondary" size="sm" @click="carregar">Tentar novamente</UiButton>
      </div>
    </AppAlert>

    <div
      :id="`error-tests-panel-${abaAtiva}`"
      role="tabpanel"
      :aria-labelledby="`error-tests-tab-${abaAtiva}`"
      tabindex="0"
      class="mt-2 space-y-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div v-if="carregando" class="space-y-3 pt-2">
        <UiSkeleton v-for="index in 2" :key="index" variant="block" />
      </div>
      <template v-else-if="testesAtivos.length">
        <ErrorTestCard
          v-for="teste in testesAtivos"
          :key="teste.id"
          :test="teste"
          :open="idsAbertos.includes(teste.id)"
          :can-manage="podeGerenciar(teste.kind)"
          :uploading="uploadingTestId === teste.id"
          :removing-attachment-id="removingAttachmentId"
          @toggle="alternarTeste(teste.id)"
          @edit="editarTeste(teste)"
          @status="atualizarStatus(teste, $event)"
          @delete="excluirTeste(teste)"
          @upload="anexarArquivo(teste, $event)"
          @remove-attachment="removerAnexo(teste.id, $event.id, $event.fileName)"
        />
      </template>
      <div v-else class="rounded-card border border-dashed border-border p-5 text-center">
        <p class="text-sm font-semibold">Nenhum teste de {{ abaAtiva }} registrado</p>
        <p class="mt-1 text-xs text-foreground-muted">Registre o primeiro teste para acompanhar o resultado e as evidências.</p>
        <UiButton v-if="podeGerenciar(abaAtiva)" variant="secondary" size="sm" class="mt-4" @click="novoTeste(abaAtiva)">
          <template #icon><Plus :size="14" aria-hidden="true" /></template>
          Criar teste {{ abaAtiva === 'bancada' ? 'de bancada' : 'em campo' }}
        </UiButton>
      </div>
    </div>

    <ErrorTestForm
      v-model="modalAberto"
      :initial-kind="testeEditando?.kind ?? abaAtiva"
      :test="testeEditando"
      :responsaveis="responsaveis"
      :saving="salvando"
      @save="salvar"
    />
  </section>
</template>
