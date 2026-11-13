<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue'
import OcorrenciaForm from '../../components/ocorrencias/OcorrenciaForm.vue'

const route = useRoute()
const router = useRouter()
const voltarPara = computed(() => router.resolve({
  path: '/ocorrencias/nova',
  query: route.query,
}).href)

function parametro(nome: string): string {
  const valor = route.query[nome]
  return typeof valor === 'string' ? valor : ''
}
</script>

<template>
  <AppShell title="Criar erros" description="Registre uma falha observada na carga e inclua evidências para investigação.">
    <template #actions>
      <NuxtLink :to="voltarPara" class="interactive inline-flex min-h-10 items-center gap-2 rounded-control border border-border bg-surface px-3 text-xs font-semibold hover:bg-surface-raised">
        <ArrowLeft :size="14" aria-hidden="true" /> Voltar aos erros
      </NuxtLink>
    </template>
    <OcorrenciaForm
      :codigo-inicial="parametro('codigo')"
      :teste-inicial="parametro('teste')"
      :teste-item-inicial="parametro('testeItem')"
      :codigo-item-inicial="parametro('codigoItem')"
      :tipo-teste-inicial="parametro('tipoTeste')"
      :titulo-inicial="parametro('titulo')"
      :descricao-inicial="parametro('descricao')"
      :voltar-para="voltarPara"
    />
  </AppShell>
</template>
