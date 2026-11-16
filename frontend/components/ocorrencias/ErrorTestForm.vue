<script setup lang="ts">
import { Check } from '@lucide/vue'
import { ref, watch } from 'vue'
import type { ErrorTest, ErrorTestInput, ErrorTestKind, ErrorTestStatus } from '../../composables/useErrorTests'

const props = defineProps<{
  modelValue: boolean
  initialKind: ErrorTestKind
  test?: ErrorTest | null
  responsaveis: Array<{ id: string; nome: string }>
  saving?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [input: ErrorTestInput]
}>()

const formId = `error-test-form-${useId()}`
const kind = ref<ErrorTestKind>('bancada')
const status = ref<ErrorTestStatus>('pendente')
const testedAt = ref('')
const responsibleIds = ref<string[]>([])
const result = ref('')
const notes = ref('')
const segment = ref('')
const model = ref('')
const version = ref('')
const loadStatus = ref<'aprovada' | 'reprovada' | ''>('')
const structureStatus = ref<'aprovada' | 'reprovada' | ''>('')
const needsBench = ref<'sim' | 'nao' | ''>('')
const needsField = ref<'sim' | 'nao' | ''>('')
const benchSolves = ref<'sim' | 'nao' | ''>('')

const statusOptions = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'reprovado', label: 'Reprovado' },
]
function paraDataLocal(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function preencher() {
  kind.value = props.test?.kind ?? props.initialKind
  status.value = props.test?.status ?? 'pendente'
  testedAt.value = paraDataLocal(props.test?.tested_at ?? new Date().toISOString())
  responsibleIds.value = props.test?.responsibles.map(responsavel => responsavel.id)
    ?? (props.test?.responsible_id ? [props.test.responsible_id] : [])
  result.value = props.test?.result ?? ''
  notes.value = props.test?.notes ?? ''
  segment.value = props.test?.segment ?? ''
  model.value = props.test?.model ?? ''
  version.value = props.test?.version ?? ''
  loadStatus.value = props.test?.load_status ?? ''
  structureStatus.value = props.test?.structure_status ?? ''
  needsBench.value = valorBooleano(props.test?.needs_bench)
  needsField.value = valorBooleano(props.test?.needs_field)
  benchSolves.value = valorBooleano(props.test?.bench_solves)
}

function valorBooleano(value: number | null | undefined): '' | 'sim' | 'nao' {
  return value === 1 ? 'sim' : value === 0 ? 'nao' : ''
}

function booleano(value: '' | 'sim' | 'nao'): boolean | null {
  return value === '' ? null : value === 'sim'
}

function salvar() {
  emit('save', {
    kind: kind.value,
    status: status.value,
    testedAt: new Date(testedAt.value).toISOString(),
    responsibleIds: responsibleIds.value,
    result: result.value.trim() || null,
    notes: notes.value.trim() || null,
    segment: segment.value.trim() || null,
    model: model.value.trim() || null,
    version: version.value.trim() || null,
    loadStatus: loadStatus.value || null,
    structureStatus: structureStatus.value || null,
    needsBench: booleano(needsBench.value),
    needsField: booleano(needsField.value),
    benchSolves: booleano(benchSolves.value),
  })
}

watch(
  () => [props.modelValue, props.test?.id, props.initialKind] as const,
  (values) => {
    if (values[0]) preencher()
  },
)
</script>

<template>
  <UiOverlay
    :model-value="modelValue"
    :title="test ? 'Editar teste' : 'Novo teste'"
    description="Registre a execução técnica vinculada a esta ocorrência."
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form :id="formId" class="space-y-4" @submit.prevent="salvar">
      <div class="grid gap-4 sm:grid-cols-2">
        <UiSelect
          id="error-test-kind"
          v-model="kind"
          label="Tipo"
          :options="[{ value: 'bancada', label: 'Bancada' }, { value: 'campo', label: 'Campo' }]"
        />
        <UiSelect id="error-test-status" v-model="status" label="Status" :options="statusOptions" />
      </div>
      <UiField id="error-test-date" v-model="testedAt" type="datetime-local" label="Data do teste" required />
      <fieldset class="space-y-2">
        <legend class="text-sm font-semibold">Responsáveis</legend>
        <div class="grid gap-2 sm:grid-cols-2">
          <label v-for="responsavel in responsaveis" :key="responsavel.id" class="flex min-h-9 items-center gap-2 rounded-control border border-border px-3 text-xs">
            <input v-model="responsibleIds" type="checkbox" :value="responsavel.id" class="accent-primary">
            <span>{{ responsavel.nome }}</span>
          </label>
        </div>
        <p v-if="!responsaveis.length" class="text-xs text-foreground-muted">Não há usuários ativos disponíveis.</p>
      </fieldset>
      <UiField id="error-test-result" v-model="result" label="Resultado" maxlength="2000" placeholder="Resumo do resultado do teste" />
      <div class="grid gap-4 sm:grid-cols-3">
        <UiField id="error-test-segment" v-model="segment" label="Segmento" maxlength="120" />
        <UiField id="error-test-model" v-model="model" label="Modelo" maxlength="120" />
        <UiField id="error-test-version" v-model="version" label="Versão" maxlength="80" />
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <UiSelect id="error-test-load-status" v-model="loadStatus" label="Status da carga" :options="[{ value: '', label: 'Não informado' }, { value: 'aprovada', label: 'Aprovada' }, { value: 'reprovada', label: 'Reprovada' }]" />
        <UiSelect id="error-test-structure-status" v-model="structureStatus" label="Status do banco / estrutura" :options="[{ value: '', label: 'Não informado' }, { value: 'aprovada', label: 'Aprovada' }, { value: 'reprovada', label: 'Reprovada' }]" />
      </div>
      <div class="grid gap-4 sm:grid-cols-3">
        <UiSelect id="error-test-needs-bench" v-model="needsBench" label="Necessário teste bancada?" :options="[{ value: '', label: 'Não informado' }, { value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }]" />
        <UiSelect id="error-test-needs-field" v-model="needsField" label="Necessário teste campo?" :options="[{ value: '', label: 'Não informado' }, { value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }]" />
        <UiSelect id="error-test-bench-solves" v-model="benchSolves" label="Bancada resolve?" :options="[{ value: '', label: 'Não informado' }, { value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }]" />
      </div>
      <label for="error-test-notes" class="block space-y-2 text-sm font-semibold">
        Observações
        <textarea
          id="error-test-notes"
          v-model="notes"
          rows="4"
          maxlength="10000"
          class="interactive w-full rounded-control border border-border bg-surface px-3 py-2 text-sm font-normal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          placeholder="Detalhes, condições e observações relevantes..."
        />
      </label>
    </form>
    <template #footer>
      <UiButton variant="secondary" :disabled="saving" @click="emit('update:modelValue', false)">Cancelar</UiButton>
      <UiButton variant="primary" type="submit" :loading="saving" :disabled="!testedAt || !responsibleIds.length" :form="formId">
        <template #icon><Check :size="14" aria-hidden="true" /></template>
        {{ test ? 'Salvar alterações' : 'Criar teste' }}
      </UiButton>
    </template>
  </UiOverlay>
</template>
