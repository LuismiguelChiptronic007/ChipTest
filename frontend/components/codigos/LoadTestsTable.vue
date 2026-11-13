<script setup lang="ts">
import { ArrowUpRight } from '@lucide/vue'
import type { LoadOverviewData } from '../../composables/useLoadOverview'

defineProps<{
  codigoId: string
  tests: LoadOverviewData['tests']
}>()

function statusBoolean(value: number | boolean | null) {
  if (value === null) return '-'
  return value === true || value === 1 ? 'Sim' : 'Não'
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date)
}

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
  </div>
</template>
