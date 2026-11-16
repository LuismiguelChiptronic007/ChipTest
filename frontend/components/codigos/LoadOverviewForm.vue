<script setup lang="ts">
<<<<<<< HEAD
import { TAMANHO_MAXIMO_ANEXO_BYTES } from '@backend/services/ocorrencias-config'
=======
import { Check } from '@lucide/vue'
>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3
import type { LoadOverviewData, LoadOverviewInput } from '../../composables/useLoadOverview'

const props = defineProps<{
  overview: LoadOverviewData['overview']
  responsaveis: LoadOverviewData['responsaveisDisponiveis']
<<<<<<< HEAD
=======
  saving?: boolean
>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3
}>()

const emit = defineEmits<{
  save: [input: LoadOverviewInput]
<<<<<<< HEAD
=======
  cancel: []
>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3
}>()

const requestNumber = ref(1)
const launchedOn = ref('')
const responsibleId = ref('')
const demandType = ref<'novo_sistema' | 'nova_funcao'>('novo_sistema')
const demandStatus = ref<'campo_com_programador' | 'campo_sem_programador'>('campo_com_programador')
const sgaPrintUrl = ref('')
const systemInfoUrl = ref('')
<<<<<<< HEAD
const sgaPrintImage = ref<File | null>(null)
const systemInfoImage = ref<File | null>(null)
const pasteError = ref('')

watch(sgaPrintUrl, () => {
  sgaPrintImage.value = null
})
watch(systemInfoUrl, () => {
  systemInfoImage.value = null
})
=======
const notes = ref('')
>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3

watch(() => props.overview, (overview: LoadOverviewData['overview']) => {
  requestNumber.value = overview.request_number
  launchedOn.value = overview.launched_on ?? ''
  responsibleId.value = overview.responsible_id ?? ''
  demandType.value = overview.demand_type
  demandStatus.value = overview.demand_status
  sgaPrintUrl.value = overview.sga_print_url ?? ''
  systemInfoUrl.value = overview.system_info_url ?? ''
<<<<<<< HEAD
  sgaPrintImage.value = null
  systemInfoImage.value = null
}, { immediate: true })

function colarImagem(event: ClipboardEvent, campo: 'sga' | 'sistema') {
  const item = Array.from(event.clipboardData?.items ?? [])
    .find(clipboardItem => clipboardItem.kind === 'file' && clipboardItem.type.startsWith('image/'))
  if (!item) return

  event.preventDefault()
  const arquivo = item.getAsFile()
  if (!arquivo) {
    pasteError.value = 'Não foi possível ler a imagem da área de transferência.'
    return
  }
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(arquivo.type)) {
    pasteError.value = 'Cole uma imagem PNG, JPG ou WebP.'
    return
  }
  if (arquivo.size > TAMANHO_MAXIMO_ANEXO_BYTES) {
    pasteError.value = 'A imagem deve ter no máximo 10 MB.'
    return
  }

  pasteError.value = ''
  const extensao = arquivo.type === 'image/png' ? 'png' : arquivo.type === 'image/webp' ? 'webp' : 'jpg'
  const imagem = new File([arquivo], `captura.${extensao}`, { type: arquivo.type })
  if (campo === 'sga') sgaPrintImage.value = imagem
  else systemInfoImage.value = imagem
}

=======
  notes.value = overview.notes ?? ''
}, { immediate: true })

>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3
function salvar() {
  emit('save', {
    requestNumber: requestNumber.value,
    launchedOn: launchedOn.value || null,
    responsibleId: responsibleId.value || null,
    demandType: demandType.value,
    demandStatus: demandStatus.value,
    sgaPrintUrl: sgaPrintUrl.value.trim() || null,
    systemInfoUrl: systemInfoUrl.value.trim() || null,
<<<<<<< HEAD
    notes: props.overview.notes,
    sgaPrintImage: sgaPrintImage.value,
    systemInfoImage: systemInfoImage.value,
  })
}

defineExpose({ salvar })
</script>

<template>
  <form class="space-y-4" @submit.prevent>
=======
    notes: notes.value.trim() || null,
  })
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="salvar">
>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3
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
<<<<<<< HEAD
      <UiField id="load-sga-print" v-model="sgaPrintUrl" label="Print SGA (URL ou imagem)" placeholder="https://" hint="Cole uma imagem com Ctrl+V ou informe uma URL." @paste="colarImagem($event, 'sga')" />
      <UiField id="load-system-info" v-model="systemInfoUrl" label="Informações do sistema (URL ou imagem)" placeholder="https://" hint="Cole uma imagem com Ctrl+V ou informe uma URL." @paste="colarImagem($event, 'sistema')" />
    </div>
    <AppAlert v-if="pasteError" tone="error">{{ pasteError }}</AppAlert>
    <p v-if="sgaPrintImage || systemInfoImage" class="text-xs text-foreground-muted">
      {{ [sgaPrintImage?.name, systemInfoImage?.name].filter(Boolean).join(' e ') }} será enviada ao salvar.
    </p>
=======
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
>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3
  </form>
</template>
