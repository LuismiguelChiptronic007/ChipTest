<script setup lang="ts">
<<<<<<< HEAD
import { Check, XCircle } from '@lucide/vue'
import type { LoadOverviewData } from '../../composables/useLoadOverview'

const props = defineProps<{
  tests: LoadOverviewData['tests']
  ocorrencias: LoadOverviewData['ocorrencias']
  responsaveis: LoadOverviewData['responsaveisDisponiveis']
  canEdit?: boolean
  editing?: boolean
}>()

const emit = defineEmits<{
  saved: []
}>()

type TestRow = LoadOverviewData['tests'][number]
type BooleanDraft = '' | 'sim' | 'nao'
type Occurrence = LoadOverviewData['ocorrencias'][number]

interface TestDraft {
  kind: 'bancada' | 'campo'
  responsibleIds: string[]
  responsibleNames: string
  testedAt: string
  segmentModelVersion: string
  loadStatus: 'aprovada' | 'reprovada' | ''
  structureStatus: 'aprovada' | 'reprovada' | ''
  needsBench: BooleanDraft
  needsField: BooleanDraft
  benchSolves: BooleanDraft
}

interface NewTestDraft extends TestDraft {
  localId: string
  occurrenceId: string
}

const salvandoId = ref('')
const rascunhos = reactive<Record<string, TestDraft>>({})
const novosTestes = ref<NewTestDraft[]>([])
const erro = ref('')
const editavel = computed(() => Boolean(props.canEdit && props.editing))

function criarRascunho(test: TestRow): TestDraft {
  return {
    kind: test.kind,
    responsibleIds: test.responsibles.map(person => person.id),
    responsibleNames: test.responsibles.map(person => person.nome).join(', '),
    testedAt: formatarDataHoraLocal(test.tested_at),
    segmentModelVersion: [test.segment, test.model, test.version].filter(Boolean).join(' - '),
    loadStatus: test.load_status ?? '',
    structureStatus: test.structure_status ?? '',
    needsBench: valorBooleano(test.needs_bench),
    needsField: valorBooleano(test.needs_field),
    benchSolves: valorBooleano(test.bench_solves),
  }
}

watch(() => props.tests, (tests: TestRow[]) => {
  const ids = new Set(tests.map(test => test.id))
  for (const test of tests) {
    if (!rascunhos[test.id]) rascunhos[test.id] = criarRascunho(test)
  }
  for (const id of Object.keys(rascunhos)) {
    if (!ids.has(id)) delete rascunhos[id]
  }
}, { immediate: true })

function novaDataHoraLocal() {
  const date = new Date()
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function adicionarTeste() {
  novosTestes.value.push({
    localId: crypto.randomUUID(),
    occurrenceId: '',
    kind: 'bancada',
    responsibleIds: [],
    responsibleNames: '',
    testedAt: novaDataHoraLocal(),
    segmentModelVersion: '',
    loadStatus: '',
    structureStatus: '',
    needsBench: '',
    needsField: '',
    benchSolves: '',
  })
}

watch(() => props.editing, (editing: boolean | undefined) => {
  if (!editing) {
    for (const test of props.tests) rascunhos[test.id] = criarRascunho(test)
    novosTestes.value = []
    erro.value = ''
    return
  }
  if (props.ocorrencias.length && !props.tests.length && !novosTestes.value.length) adicionarTeste()
}, { immediate: true })

function rascunhoDe(test: TestRow): TestDraft {
  return rascunhos[test.id] ?? (rascunhos[test.id] = criarRascunho(test))
}

function statusBooleano(value: number | boolean | null) {
=======
import { ArrowUpRight } from '@lucide/vue'
import type { LoadOverviewData } from '../../composables/useLoadOverview'

defineProps<{
  codigoId: string
  tests: LoadOverviewData['tests']
}>()

function statusBoolean(value: number | boolean | null) {
>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3
  if (value === null) return '-'
  return value === true || value === 1 ? 'Sim' : 'Não'
}

<<<<<<< HEAD
function valorBooleano(value: number | boolean | null): BooleanDraft {
  if (value === null) return ''
  return value === true || value === 1 ? 'sim' : 'nao'
}

function formatarData(value: string) {
=======
function formatDate(value: string) {
>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date)
}

<<<<<<< HEAD
function formatarDataHoraLocal(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function cancelarEdicao(test: TestRow) {
  rascunhos[test.id] = criarRascunho(test)
  erro.value = ''
}

function booleano(value: BooleanDraft): boolean | null {
  return value === '' ? null : value === 'sim'
}

function resolverResponsaveis(nomes: string): string[] | null {
  const normalizar = (value: string) => value.trim().toLocaleLowerCase('pt-BR')
  const nomesDigitados = nomes.split(/[,;\n]/).map(nome => nome.trim()).filter(Boolean)
  const ids = nomesDigitados.map((nome) => {
    const responsavel = props.responsaveis.find(
      person => normalizar(person.nome) === normalizar(nome),
    )
    return responsavel?.id
  })
  if (ids.some(id => !id)) return null
  return [...new Set(ids.filter((id): id is string => Boolean(id)))]
}

function separarSegmentoModeloVersao(value: string) {
  const [segment, model, ...version] = value.split(' - ').map(part => part.trim())
  return {
    segment: segment || null,
    model: model || null,
    version: version.join(' - ') || null,
  }
}

async function salvar(test: TestRow) {
  const rascunho = rascunhoDe(test)
  const valores = { ...rascunho, responsibleIds: [...rascunho.responsibleIds] }
  const responsaveisOriginais = test.responsibles.map(person => person.nome).join(', ')
  if (valores.responsibleNames !== responsaveisOriginais) {
    const ids = resolverResponsaveis(valores.responsibleNames)
    if (ids === null) {
      erro.value = 'Informe nomes de responsáveis ativos do sistema, separados por vírgula ou ponto e vírgula.'
      return
    }
    valores.responsibleIds = ids
  }
  if (!valores.responsibleNames.trim() || !valores.responsibleIds.length) {
    erro.value = 'Informe ao menos um responsável para o teste.'
    return
  }
  const dadosSegmento = valores.segmentModelVersion
    === [test.segment, test.model, test.version].filter(Boolean).join(' - ')
    ? { segment: test.segment, model: test.model, version: test.version }
    : separarSegmentoModeloVersao(valores.segmentModelVersion)

  salvandoId.value = test.id
  erro.value = ''
  try {
    await $fetch(`/api/ocorrencias/${test.ocorrencia_id}/testes/${test.id}`, {
      method: 'PATCH',
      body: {
        kind: valores.kind,
        responsibleIds: valores.responsibleIds,
        testedAt: new Date(valores.testedAt).toISOString(),
        segment: dadosSegmento.segment,
        model: dadosSegmento.model,
        version: dadosSegmento.version,
        loadStatus: valores.loadStatus || null,
        structureStatus: valores.structureStatus || null,
        needsBench: booleano(valores.needsBench),
        needsField: booleano(valores.needsField),
        benchSolves: booleano(valores.benchSolves),
      },
    })
    rascunhos[test.id] = valores
    emit('saved')
  } catch (cause: unknown) {
    erro.value = mensagemDeErro(cause, 'Não foi possível salvar as alterações do teste.')
  } finally {
    salvandoId.value = ''
  }
}

function removerNovoTeste(localId: string) {
  novosTestes.value = novosTestes.value.filter((test: NewTestDraft) => test.localId !== localId)
}

async function salvarNovoTeste(test: NewTestDraft) {
  if (!test.occurrenceId) {
    erro.value = 'Selecione a ocorrência à qual este teste será associado.'
    return
  }
  const responsibleIds = resolverResponsaveis(test.responsibleNames)
  if (!test.testedAt || !test.responsibleNames.trim() || !responsibleIds?.length) {
    erro.value = !test.responsibleNames.trim()
      ? 'Informe ao menos um responsável para salvar o teste.'
      : responsibleIds === null
        ? 'Informe nomes de responsáveis ativos do sistema, separados por vírgula ou ponto e vírgula.'
        : 'Informe a data e ao menos um responsável para salvar o teste.'
    return
  }

  const testedAt = new Date(test.testedAt)
  if (Number.isNaN(testedAt.getTime())) {
    erro.value = 'Informe uma data e hora válidas.'
    return
  }
  const dadosSegmento = separarSegmentoModeloVersao(test.segmentModelVersion)

  salvandoId.value = test.localId
  erro.value = ''
  try {
    await $fetch(`/api/ocorrencias/${test.occurrenceId}/testes`, {
      method: 'POST',
      body: {
        kind: test.kind,
        status: 'pendente',
        testedAt: testedAt.toISOString(),
        responsibleIds,
        result: null,
        notes: null,
        segment: dadosSegmento.segment,
        model: dadosSegmento.model,
        version: dadosSegmento.version,
        loadStatus: test.loadStatus || null,
        structureStatus: test.structureStatus || null,
        needsBench: booleano(test.needsBench),
        needsField: booleano(test.needsField),
        benchSolves: booleano(test.benchSolves),
      },
    })
    removerNovoTeste(test.localId)
    emit('saved')
  } catch (cause: unknown) {
    erro.value = mensagemDeErro(cause, 'Não foi possível criar o teste.')
  } finally {
    salvandoId.value = ''
  }
}

function tomTipo(kind: 'bancada' | 'campo') {
  return kind === 'bancada' ? 'text-success' : 'text-primary'
}

function rotuloOcorrencia(ocorrencia: Occurrence) {
  const status = ocorrencia.status === 'aberta'
    ? 'Aberta'
    : ocorrencia.status === 'em_analise' ? 'Em análise' : 'Resolvida'
  return `${ocorrencia.titulo} · ${status}`
}

const classeCampo = 'interactive min-h-9 w-full min-w-24 rounded-control border border-border bg-surface px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15'
const classeCelula = 'border-b border-r border-border px-3 py-3 align-top last:border-r-0'
</script>

<template>
  <div class="space-y-3">
    <AppAlert v-if="erro" tone="error">{{ erro }}</AppAlert>
    <datalist id="load-test-responsibles">
      <option v-for="person in responsaveis" :key="person.id" :value="person.nome" />
    </datalist>
    <div v-if="editavel" class="flex flex-wrap items-center justify-between gap-3">
      <p v-if="!ocorrencias.length" class="text-xs text-foreground-muted">
        Cadastre uma ocorrência nesta DSD antes de adicionar um teste.
      </p>
      <UiButton variant="secondary" size="sm" :disabled="!ocorrencias.length || Boolean(salvandoId)" @click="adicionarTeste">
        Adicionar teste
      </UiButton>
    </div>
    <div class="overflow-x-auto rounded-card border border-border">
      <table class="w-full min-w-[1400px] table-fixed border-collapse text-left text-xs">
        <thead class="bg-surface-raised text-[10px] uppercase tracking-wide text-foreground-subtle">
          <tr>
            <th scope="col" class="w-36 border-b border-r border-border px-3 py-3 font-bold">Tipo do teste</th>
            <th scope="col" class="w-48 border-b border-r border-border px-3 py-3 font-bold">Responsáveis</th>
            <th scope="col" class="w-40 border-b border-r border-border px-3 py-3 font-bold">Data</th>
            <th scope="col" class="w-56 border-b border-r border-border px-3 py-3 font-bold">Segmento - Modelo - Versão</th>
            <th scope="col" class="w-36 border-b border-r border-border px-3 py-3 font-bold">Status da carga</th>
            <th scope="col" class="w-40 border-b border-r border-border px-3 py-3 font-bold">Status do banco / estrutura</th>
            <th scope="col" class="w-36 border-b border-r border-border px-3 py-3 font-bold">Necessário teste bancada?</th>
            <th scope="col" class="w-36 border-b border-r border-border px-3 py-3 font-bold">Necessário teste campo?</th>
            <th scope="col" class="w-32 border-b border-border px-3 py-3 font-bold">Bancada resolve?</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="test in tests" :key="test.id">
            <tr class="hover:bg-surface-raised/50">
            <td :class="classeCelula">
              <template v-if="editavel">
                <select v-model="rascunhoDe(test).kind" :class="classeCampo" aria-label="Tipo do teste">
                  <option value="bancada">Bancada</option>
                  <option value="campo">Campo</option>
                </select>
              </template>
              <div v-else class="flex flex-col items-start gap-2">
                <span class="font-bold" :class="tomTipo(test.kind)">{{ test.kind === 'bancada' ? 'Bancada' : 'Campo' }}</span>
              </div>
            </td>
            <td :class="classeCelula">
              <input
                v-if="editavel"
                v-model="rascunhoDe(test).responsibleNames"
                type="text"
                :class="classeCampo"
                aria-label="Responsáveis pelo teste"
                placeholder="Nomes cadastrados, separados por vírgula"
                list="load-test-responsibles"
                autocomplete="off"
              >
              <span v-else>{{ test.responsibles.map(person => person.nome).join(', ') || '-' }}</span>
            </td>
            <td :class="classeCelula">
              <input v-if="editavel" v-model="rascunhoDe(test).testedAt" type="datetime-local" :class="classeCampo" aria-label="Data do teste">
              <span v-else>{{ formatarData(test.tested_at) }}</span>
            </td>
            <td :class="classeCelula">
              <input
                v-if="editavel"
                v-model="rascunhoDe(test).segmentModelVersion"
                type="text"
                :class="classeCampo"
                aria-label="Segmento, modelo e versão"
                maxlength="326"
                placeholder="Digite segmento, modelo e versão"
              >
              <span v-else>{{ [test.segment, test.model, test.version].filter(Boolean).join(' - ') || '-' }}</span>
            </td>
            <td :class="classeCelula">
              <select v-if="editavel" v-model="rascunhoDe(test).loadStatus" :class="classeCampo" aria-label="Status da carga">
                <option value="">Não informado</option>
                <option value="aprovada">Aprovada</option>
                <option value="reprovada">Reprovada</option>
              </select>
              <span v-else class="font-semibold" :class="test.load_status === 'aprovada' ? 'text-success' : test.load_status === 'reprovada' ? 'text-danger' : 'text-foreground-muted'">
                {{ test.load_status === 'aprovada' ? 'Aprovada' : test.load_status === 'reprovada' ? 'Reprovada' : '-' }}
              </span>
            </td>
            <td :class="classeCelula">
              <select v-if="editavel" v-model="rascunhoDe(test).structureStatus" :class="classeCampo" aria-label="Status do banco ou estrutura">
                <option value="">Não informado</option>
                <option value="aprovada">Aprovada</option>
                <option value="reprovada">Reprovada</option>
              </select>
              <span v-else class="font-semibold" :class="test.structure_status === 'aprovada' ? 'text-success' : test.structure_status === 'reprovada' ? 'text-danger' : 'text-foreground-muted'">
                {{ test.structure_status === 'aprovada' ? 'Aprovada' : test.structure_status === 'reprovada' ? 'Reprovada' : '-' }}
              </span>
            </td>
            <td :class="classeCelula">
              <select v-if="editavel" v-model="rascunhoDe(test).needsBench" :class="classeCampo" aria-label="Necessário teste bancada">
                <option value="">Não informado</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
              <span v-else>{{ statusBooleano(test.needs_bench) }}</span>
            </td>
            <td :class="classeCelula">
              <select v-if="editavel" v-model="rascunhoDe(test).needsField" :class="classeCampo" aria-label="Necessário teste campo">
                <option value="">Não informado</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
              <span v-else>{{ statusBooleano(test.needs_field) }}</span>
            </td>
            <td :class="[classeCelula, 'border-r-0']">
              <select v-if="editavel" v-model="rascunhoDe(test).benchSolves" :class="classeCampo" aria-label="Bancada resolve">
                <option value="">Não informado</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
              <span v-else>{{ statusBooleano(test.bench_solves) }}</span>
            </td>
            </tr>
            <tr v-if="editavel">
            <td colspan="9" class="border-b border-border px-3 py-2">
              <div class="flex justify-end gap-2">
                <UiButton
                  variant="primary"
                  size="sm"
                  :loading="salvandoId === test.id"
                  :disabled="Boolean(salvandoId) || !rascunhoDe(test).testedAt || !rascunhoDe(test).responsibleNames.trim()"
                  aria-label="Salvar teste"
                  @click="salvar(test)"
                >
                  <template #icon><Check :size="13" aria-hidden="true" /></template>Salvar teste
                </UiButton>
                <UiButton
                  variant="secondary"
                  size="sm"
                  :disabled="Boolean(salvandoId)"
                  aria-label="Descartar alterações do teste"
                  @click="cancelarEdicao(test)"
                >
                  <template #icon><XCircle :size="13" aria-hidden="true" /></template>Descartar
                </UiButton>
              </div>
            </td>
            </tr>
          </template>
          <template v-for="test in editavel ? novosTestes : []" :key="test.localId">
            <tr class="bg-surface-raised/40">
            <td :class="classeCelula">
              <select v-model="test.kind" :class="classeCampo" aria-label="Tipo do teste">
                <option value="bancada">Bancada</option>
                <option value="campo">Campo</option>
              </select>
            </td>
            <td :class="classeCelula">
              <input
                v-model="test.responsibleNames"
                type="text"
                :class="classeCampo"
                aria-label="Responsáveis pelo teste"
                placeholder="Nomes cadastrados, separados por vírgula"
                list="load-test-responsibles"
                autocomplete="off"
              >
            </td>
            <td :class="classeCelula">
              <input v-model="test.testedAt" type="datetime-local" :class="classeCampo" aria-label="Data do teste">
            </td>
            <td :class="classeCelula">
              <input
                v-model="test.segmentModelVersion"
                type="text"
                :class="classeCampo"
                aria-label="Segmento, modelo e versão"
                maxlength="326"
                placeholder="Digite segmento, modelo e versão"
              >
            </td>
            <td :class="classeCelula">
              <select v-model="test.loadStatus" :class="classeCampo" aria-label="Status da carga">
                <option value="">Não informado</option>
                <option value="aprovada">Aprovada</option>
                <option value="reprovada">Reprovada</option>
              </select>
            </td>
            <td :class="classeCelula">
              <select v-model="test.structureStatus" :class="classeCampo" aria-label="Status do banco ou estrutura">
                <option value="">Não informado</option>
                <option value="aprovada">Aprovada</option>
                <option value="reprovada">Reprovada</option>
              </select>
            </td>
            <td :class="classeCelula">
              <select v-model="test.needsBench" :class="classeCampo" aria-label="Necessário teste bancada">
                <option value="">Não informado</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
            </td>
            <td :class="classeCelula">
              <select v-model="test.needsField" :class="classeCampo" aria-label="Necessário teste campo">
                <option value="">Não informado</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
            </td>
            <td :class="[classeCelula, 'border-r-0']">
              <select v-model="test.benchSolves" :class="classeCampo" aria-label="Bancada resolve">
                <option value="">Não informado</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
            </td>
            </tr>
            <tr>
            <td colspan="9" class="border-b border-border px-3 py-2">
              <div class="flex flex-wrap items-end justify-between gap-3">
                <label class="min-w-64 flex-1 space-y-1 text-[10px] font-semibold text-foreground-muted">
                  Ocorrência vinculada
                  <select v-model="test.occurrenceId" :class="classeCampo" aria-label="Ocorrência associada ao teste">
                    <option value="">Selecione a ocorrência</option>
                    <option v-for="occurrence in ocorrencias" :key="occurrence.id" :value="occurrence.id">
                      {{ rotuloOcorrencia(occurrence) }}
                    </option>
                  </select>
                </label>
                <div class="flex gap-2">
                  <UiButton
                    variant="primary"
                    size="sm"
                    :loading="salvandoId === test.localId"
                    :disabled="Boolean(salvandoId) || !test.testedAt || !test.responsibleNames.trim() || !test.occurrenceId"
                    @click="salvarNovoTeste(test)"
                  >
                    <template #icon><Check :size="13" aria-hidden="true" /></template>Salvar teste
                  </UiButton>
                  <UiButton
                    variant="secondary"
                    size="sm"
                    :disabled="Boolean(salvandoId)"
                    aria-label="Descartar novo teste"
                    @click="removerNovoTeste(test.localId)"
                  >
                    <template #icon><XCircle :size="13" aria-hidden="true" /></template>Descartar
                  </UiButton>
                </div>
              </div>
            </td>
            </tr>
          </template>
          <tr v-if="!tests.length && (!editavel || !novosTestes.length)">
            <td colspan="9" class="px-3 py-8 text-center text-sm text-foreground-muted">Nenhum teste realizado nos erros desta DSD.</td>
          </tr>
        </tbody>
      </table>
    </div>
=======
function kindTone(kind: 'bancada' | 'campo') {
  return kind === 'bancada' ? 'text-success' : 'text-primary'
}
</script>

<template>
  <div class="overflow-x-auto rounded-card border border-border">
    <table class="w-full min-w-[1180px] text-left text-xs">
      <thead class="bg-surface-raised text-[10px] uppercase tracking-wide text-foreground-subtle">
        <tr>
          <th class="px-3 py-3 font-bold">Tipo do teste / nº</th>
          <th class="px-3 py-3 font-bold">Erro</th>
          <th class="px-3 py-3 font-bold">Responsáveis</th>
          <th class="px-3 py-3 font-bold">Data</th>
          <th class="px-3 py-3 font-bold">Segmento - Modelo - Versão</th>
          <th class="px-3 py-3 font-bold">Status da carga</th>
          <th class="px-3 py-3 font-bold">Status do banco / estrutura</th>
          <th class="px-3 py-3 font-bold">Necessário teste bancada?</th>
          <th class="px-3 py-3 font-bold">Necessário teste campo?</th>
          <th class="px-3 py-3 font-bold">Bancada resolve?</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border">
        <tr v-for="test in tests" :key="test.id" class="hover:bg-surface-raised/50">
          <td class="px-3 py-3">
            <NuxtLink
              :to="{ path: `/ocorrencias/${test.ocorrencia_id}`, query: { tab: test.kind, test: test.id } }"
              class="interactive inline-flex items-center gap-1 font-bold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              :class="kindTone(test.kind)"
            >
              {{ test.kind === 'bancada' ? 'Bancada' : 'Campo' }} - {{ String(test.sequence).padStart(2, '0') }}
              <ArrowUpRight :size="12" aria-hidden="true" />
            </NuxtLink>
          </td>
          <td class="max-w-64 truncate px-3 py-3 font-medium" :title="test.error_title">{{ test.error_title }}</td>
          <td class="px-3 py-3">{{ test.responsibles.map(person => person.nome).join(', ') || '-' }}</td>
          <td class="px-3 py-3">{{ formatDate(test.tested_at) }}</td>
          <td class="px-3 py-3">{{ [test.segment, test.model, test.version].filter(Boolean).join(' - ') || '-' }}</td>
          <td class="px-3 py-3 font-semibold" :class="test.load_status === 'aprovada' ? 'text-success' : test.load_status === 'reprovada' ? 'text-danger' : 'text-foreground-muted'">
            {{ test.load_status === 'aprovada' ? 'Aprovada' : test.load_status === 'reprovada' ? 'Reprovada' : '-' }}
          </td>
          <td class="px-3 py-3 font-semibold" :class="test.structure_status === 'aprovada' ? 'text-success' : test.structure_status === 'reprovada' ? 'text-danger' : 'text-foreground-muted'">
            {{ test.structure_status === 'aprovada' ? 'Aprovada' : test.structure_status === 'reprovada' ? 'Reprovada' : '-' }}
          </td>
          <td class="px-3 py-3">{{ statusBoolean(test.needs_bench) }}</td>
          <td class="px-3 py-3">{{ statusBoolean(test.needs_field) }}</td>
          <td class="px-3 py-3">{{ statusBoolean(test.bench_solves) }}</td>
        </tr>
        <tr v-if="!tests.length">
          <td colspan="10" class="px-3 py-8 text-center text-sm text-foreground-muted">Nenhum teste realizado nos erros desta DSD.</td>
        </tr>
      </tbody>
    </table>
>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3
  </div>
</template>
