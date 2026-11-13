<script setup lang="ts">
import { ChevronDown, FileText, LoaderCircle, Pencil, Paperclip, Trash2 } from '@lucide/vue'
import type { ErrorTest, ErrorTestStatus } from '../../composables/useErrorTests'

const props = defineProps<{
  test: ErrorTest
  open: boolean
  canManage: boolean
  uploading: boolean
  removingAttachmentId?: string
}>()

const emit = defineEmits<{
  toggle: []
  edit: []
  status: [value: ErrorTestStatus]
  delete: []
  upload: [file: File]
  removeAttachment: [attachment: { id: string; fileName: string }]
}>()

const fileInput = ref<HTMLInputElement>()
const statusLabels: Record<ErrorTestStatus, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
}
const statusTone: Record<ErrorTestStatus, 'neutral' | 'warning' | 'success' | 'danger'> = {
  pendente: 'neutral',
  em_andamento: 'warning',
  aprovado: 'success',
  reprovado: 'danger',
}

function formatarData(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function urlAnexo(id: string) {
  return `/api/ocorrencias/${props.test.ocorrencia_id}/testes/${props.test.id}/anexos/${id}`
}

function selecionarArquivo(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) emit('upload', file)
  input.value = ''
}
</script>

<template>
  <article class="overflow-hidden rounded-card border border-border bg-surface transition-colors">
    <h3>
      <button
        type="button"
        class="interactive flex w-full flex-wrap items-center gap-x-4 gap-y-2 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:px-5"
        :aria-expanded="open"
        :aria-controls="`error-test-body-${test.id}`"
        @click="emit('toggle')"
      >
        <span class="inline-flex min-w-28 items-center gap-2 font-semibold">
          <ChevronDown :size="16" class="shrink-0 text-foreground-subtle transition-transform duration-150" :class="{ 'rotate-180': open }" aria-hidden="true" />
          {{ test.kind === 'bancada' ? 'Bancada' : 'Campo' }} {{ String(test.sequence).padStart(2, '0') }}
        </span>
        <UiBadge :tone="statusTone[test.status]">{{ statusLabels[test.status] }}</UiBadge>
        <span class="ml-auto flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground-muted sm:justify-end">
          <span class="whitespace-nowrap">{{ formatarData(test.tested_at) }}</span>
          <span class="max-w-48 truncate">{{ test.responsibles.map(item => item.nome).join(', ') || 'Sem responsável' }}</span>
        </span>
      </button>
    </h3>

    <Transition name="test-card">
      <div v-if="open" :id="`error-test-body-${test.id}`" role="region" class="border-t border-border px-4 py-4 sm:px-5">
        <div class="flex flex-wrap items-center gap-2">
          <UiBadge :tone="test.kind === 'bancada' ? 'warning' : 'success'">
            {{ test.kind === 'bancada' ? 'Bancada' : 'Campo' }}
          </UiBadge>
          <span class="text-xs text-foreground-muted">Responsáveis: {{ test.responsibles.map(item => item.nome).join(', ') || 'Não atribuídos' }}</span>
        </div>

        <dl class="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt class="text-[11px] font-semibold uppercase tracking-wide text-foreground-subtle">Resultado</dt>
            <dd class="mt-1 whitespace-pre-wrap text-sm text-foreground-muted">{{ test.result || 'Sem resultado informado.' }}</dd>
          </div>
          <div class="sm:col-span-2">
            <dt class="text-[11px] font-semibold uppercase tracking-wide text-foreground-subtle">Observações</dt>
            <dd class="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-foreground-muted">{{ test.notes || 'Sem observações.' }}</dd>
          </div>
        </dl>

        <NuxtLink
          v-if="test.source === 'carga' && test.source_test_id"
          :to="`/testes/${test.source_test_id}`"
          class="interactive mt-4 inline-flex min-h-9 items-center rounded-control border border-border bg-surface px-3 text-xs font-semibold hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Abrir teste da carga
        </NuxtLink>

        <div class="mt-4 border-t border-border pt-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 class="text-xs font-bold">Evidências do teste</h4>
              <p v-if="!test.attachments.length" class="mt-1 text-xs text-foreground-subtle">Nenhum arquivo anexado.</p>
            </div>
            <input
              ref="fileInput"
              type="file"
              accept=".png,.jpg,.jpeg,.webp,.pdf,.mp4,.txt,.log"
              class="sr-only"
              :disabled="!canManage || uploading"
              @change="selecionarArquivo"
            >
            <UiButton v-if="canManage" variant="secondary" size="sm" :loading="uploading" @click="fileInput?.click()">
              <template #icon><Paperclip :size="14" aria-hidden="true" /></template>Adicionar arquivo
            </UiButton>
          </div>
          <ul v-if="test.attachments.length" class="mt-3 flex flex-wrap gap-2">
            <li v-for="attachment in test.attachments" :key="attachment.id" class="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-surface-raised pl-2.5 pr-1">
              <FileText :size="13" class="shrink-0 text-primary" aria-hidden="true" />
              <a :href="urlAnexo(attachment.id)" :download="attachment.file_name" class="max-w-56 truncate py-1.5 text-xs font-medium hover:text-primary">{{ attachment.file_name }}</a>
              <button
                v-if="canManage"
                type="button"
                class="rounded-full p-1 text-foreground-subtle hover:bg-danger-surface hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                :disabled="removingAttachmentId === attachment.id"
                :aria-label="`Remover arquivo ${attachment.file_name}`"
                @click="emit('removeAttachment', { id: attachment.id, fileName: attachment.file_name })"
              >
                <LoaderCircle v-if="removingAttachmentId === attachment.id" :size="13" class="animate-spin" aria-hidden="true" />
                <Trash2 v-else :size="13" aria-hidden="true" />
              </button>
            </li>
          </ul>
        </div>

        <div v-if="canManage" class="mt-4 flex flex-wrap items-end gap-2 border-t border-border pt-4">
          <UiButton variant="secondary" size="sm" @click="emit('edit')">
            <template #icon><Pencil :size="13" aria-hidden="true" /></template>Editar
          </UiButton>
          <label class="flex min-h-8 items-center gap-2 text-xs font-semibold text-foreground-muted">
            <span>Alterar status</span>
            <select
              :value="test.status"
              class="interactive min-h-8 rounded-control border border-border bg-surface px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
              :aria-label="`Alterar status de ${test.kind} ${String(test.sequence).padStart(2, '0')}`"
              @change="emit('status', ($event.target as HTMLSelectElement).value as ErrorTestStatus)"
            >
              <option v-for="(label, value) in statusLabels" :key="value" :value="value">{{ label }}</option>
            </select>
          </label>
          <UiButton variant="danger" size="sm" @click="emit('delete')">
            <template #icon><Trash2 :size="13" aria-hidden="true" /></template>Excluir
          </UiButton>
        </div>
      </div>
    </Transition>
  </article>
</template>

<style scoped>
.test-card-enter-active,
.test-card-leave-active {
  transition: opacity 150ms ease, transform 150ms ease;
}

.test-card-enter-from,
.test-card-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
