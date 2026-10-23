<script setup lang="ts">
import { FileText, Upload } from '@lucide/vue'

const props = withDefaults(defineProps<{
  modelValue?: File | null
  accept?: string
  maxSizeMb?: number
}>(), {
  accept: '.docx',
  maxSizeMb: 20,
})

const emit = defineEmits<{
  'update:modelValue': [file: File | null]
}>()

const dragActive = ref(false)
const inputId = useId()
const error = ref('')

function selectFile(file?: File) {
  error.value = ''
  if (!file) return
  if (props.accept === '.docx' && !file.name.toLowerCase().endsWith('.docx')) {
    error.value = 'Selecione um documento Word no formato .docx.'
    return
  }
  if (file.size > props.maxSizeMb * 1024 * 1024) {
    error.value = `O arquivo deve ter no máximo ${props.maxSizeMb} MB.`
    return
  }
  emit('update:modelValue', file)
}

function handleInputChange(event: Event) {
  const input = event.target as HTMLInputElement
  selectFile(input.files?.[0])
  input.value = ''
}
</script>

<template>
  <div>
    <label
      :for="inputId"
      class="interactive flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-card border border-dashed px-5 text-center"
      :class="dragActive ? 'border-primary bg-info-surface' : 'border-border-strong bg-surface-raised hover:border-primary hover:bg-info-surface/50'"
      @dragover.prevent="dragActive = true"
      @dragleave.prevent="dragActive = false"
      @drop.prevent="dragActive = false; selectFile($event.dataTransfer?.files[0])"
    >
      <input :id="inputId" class="sr-only" type="file" :accept="accept" @change="handleInputChange">
      <span class="mb-2 grid h-10 w-10 place-items-center rounded-full bg-surface text-primary shadow-card">
        <FileText v-if="modelValue" :size="18" aria-hidden="true" />
        <Upload v-else :size="18" aria-hidden="true" />
      </span>
      <span class="text-xs font-semibold">{{ modelValue?.name || 'Solte o documento Word aqui' }}</span>
      <span class="mt-1 text-[11px] text-foreground-muted">{{ modelValue ? 'Arquivo selecionado · DOCX' : `ou clique para procurar · até ${maxSizeMb} MB` }}</span>
    </label>
    <p v-if="error" role="alert" class="mt-2 text-xs font-medium text-danger">{{ error }}</p>
  </div>
</template>
