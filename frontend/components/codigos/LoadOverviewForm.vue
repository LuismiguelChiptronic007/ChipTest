<script setup lang="ts">
import { Check } from '@lucide/vue'
import type { LoadOverviewData, LoadOverviewInput } from '../../composables/useLoadOverview'

const props = defineProps<{
  overview: LoadOverviewData['overview']
  responsaveis: LoadOverviewData['responsaveisDisponiveis']
  saving?: boolean
}>()

const emit = defineEmits<{
  save: [input: LoadOverviewInput]
  cancel: []
}>()

const requestNumber = ref(1)
const launchedOn = ref('')
const responsibleId = ref('')
const demandType = ref<'novo_sistema' | 'nova_funcao'>('novo_sistema')
const demandStatus = ref<'campo_com_programador' | 'campo_sem_programador'>('campo_com_programador')
const sgaPrintUrl = ref('')
const systemInfoUrl = ref('')
const notes = ref('')

watch(() => props.overview, (overview: LoadOverviewData['overview']) => {
  requestNumber.value = overview.request_number
  launchedOn.value = overview.launched_on ?? ''
  responsibleId.value = overview.responsible_id ?? ''
  demandType.value = overview.demand_type
  demandStatus.value = overview.demand_status
  sgaPrintUrl.value = overview.sga_print_url ?? ''
  systemInfoUrl.value = overview.system_info_url ?? ''
  notes.value = overview.notes ?? ''
}, { immediate: true })

function salvar() {
  emit('save', {
    requestNumber: requestNumber.value,
    launchedOn: launchedOn.value || null,
    responsibleId: responsibleId.value || null,
    demandType: demandType.value,
    demandStatus: demandStatus.value,
    sgaPrintUrl: sgaPrintUrl.value.trim() || null,
    systemInfoUrl: systemInfoUrl.value.trim() || null,
    notes: notes.value.trim() || null,
  })
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="salvar">
    <div class="grid gap-4 sm:grid-cols-2">
      <UiField id="load-launched-on" v-model="launchedOn" type="date" label="Data" />
      <UiSelect
        id="load-responsible"
        v-model="responsibleId"
        label="Responsável lançamento"
        :options="[{ value: '', label: 'Selecione um usuário' }, ...responsaveis.map(user => ({ value: user.id, label: user.nome }))]"
      />
      <UiSelect
        id="load-demand-type"
        v-model="demandType"
        label="Tipo da demanda"
        :options="[{ value: 'novo_sistema', label: 'Novo Sistema' }, { value: 'nova_funcao', label: 'Nova Função' }]"
      />
      <UiSelect
        id="load-demand-status"
        v-model="demandStatus"
        label="Status demanda"
        :options="[{ value: 'campo_com_programador', label: 'Campo com Programador' }, { value: 'campo_sem_programador', label: 'Campo sem Programador' }]"
      />
      <UiField id="load-request-number" v-model="requestNumber" type="number" min="1" label="Número da solicitação" required />
      <UiField id="load-sga-print" v-model="sgaPrintUrl" type="url" label="Print SGA (URL)" placeholder="https://" />
      <UiField id="load-system-info" v-model="systemInfoUrl" type="url" label="Informações do sistema (URL)" placeholder="https://" />
    </div>
    <label for="load-overview-notes" class="block space-y-2 text-sm font-semibold">
      Notas
      <textarea
        id="load-overview-notes"
        v-model="notes"
        rows="4"
        maxlength="10000"
        class="interactive w-full rounded-control border border-border bg-surface px-3 py-2 text-sm font-normal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
      />
    </label>
    <div class="flex justify-end gap-2">
      <UiButton variant="secondary" type="button" :disabled="saving" @click="emit('cancel')">Cancelar</UiButton>
      <UiButton variant="primary" type="submit" :loading="saving">
        <template #icon><Check :size="14" aria-hidden="true" /></template>Salvar
      </UiButton>
    </div>
  </form>
</template>
