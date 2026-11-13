<script setup lang="ts">
import { AlertTriangle, ArrowLeft, CalendarDays, Check, CheckCircle2, Download, FileText, LoaderCircle, MessageSquare, Paperclip, RefreshCw, Send, Trash2, UserRound } from '@lucide/vue'
import { computed, ref } from 'vue'
import { z } from 'zod'
import ErrorTestsSection from '../../components/ocorrencias/ErrorTestsSection.vue'
import OcorrenciaStatusBadge from '../../components/ocorrencias/OcorrenciaStatusBadge.vue'

const route = useRoute()
const auth = useAuthStore()
const id = computed(() => String(route.params.id))
const voltarPara = computed(() => {
  const destino = route.query.voltar
  if (
    typeof destino === 'string'
    && destino.startsWith('/')
    && !destino.startsWith('//')
    && !destino.includes('\\')
    && /^\/(ocorrencias(?:\/nova)?|testes(?:\/[^/?#]+)?|codigos(?:\/[^/?#]+)?)?(?:[?#]|$)/.test(destino)
  ) return destino
  return '/ocorrencias/nova'
})
const carregando = ref(true)
const salvando = ref(false)
const enviandoComentario = ref(false)
const erro = ref('')
const dados = ref<z.infer<typeof respostaSchema> | null>(null)
const responsaveis = ref<Array<{ id: string; nome: string }>>([])
const editando = ref(false)
const tipoTeste = ref('')
const titulo = ref('')
const descricao = ref('')
const gravidade = ref<'baixa' | 'media' | 'alta' | 'critica'>('baixa')
const status = ref<'aberta' | 'em_analise' | 'resolvida' | 'descartada'>('aberta')
const responsavelId = ref('')
const resolucao = ref('')
const comentario = ref('')
const anexoRemovendo = ref('')

const respostaSchema = z.object({
  ocorrencia: z.object({
    id: z.string().uuid(),
    codigo_id: z.string().uuid(),
    codigo: z.string(),
    marca: z.string(),
    modelo: z.string(),
    teste_id: z.string().uuid().nullable(),
    teste_item_id: z.string().uuid().nullable(),
    codigo_item_id: z.string().uuid().nullable(),
    teste_resumo: z.string().nullable(),
    teste_item_nome: z.string().nullable(),
    codigo_item_nome: z.string().nullable(),
    tipo_teste: z.string().nullable(),
    titulo: z.string(),
    descricao: z.string(),
    gravidade: z.enum(['baixa', 'media', 'alta', 'critica']),
    status: z.enum(['aberta', 'em_analise', 'resolvida', 'descartada']),
    relatado_por: z.string().uuid(),
    relator_nome: z.string(),
    responsavel_id: z.string().uuid().nullable(),
    responsavel_nome: z.string().nullable(),
    resolucao: z.string().nullable(),
    criado_em: z.string(),
    atualizado_em: z.string(),
    resolvido_em: z.string().nullable(),
    total_anexos: z.number().int().nonnegative(),
    total_comentarios: z.number().int().nonnegative(),
  }),
  comentarios: z.array(z.object({
    id: z.string().uuid(),
    usuario_id: z.string().uuid(),
    usuario_nome: z.string(),
    texto: z.string(),
    criado_em: z.string(),
  })),
  anexos: z.array(z.object({
    id: z.string().uuid(),
    ocorrencia_id: z.string().uuid(),
    nome_original: z.string(),
    tipo_mime: z.string(),
    tamanho_bytes: z.number().int().positive(),
    enviado_por: z.string().uuid(),
    status_upload: z.enum(['enviando', 'pronto']),
    criado_em: z.string(),
  })),
  historico: z.array(z.object({
    id: z.string().uuid(),
    usuario_id: z.string().uuid().nullable(),
    usuario_nome: z.string().nullable(),
    antes: z.record(z.string(), z.unknown()).nullable(),
    depois: z.record(z.string(), z.unknown()).nullable(),
    criado_em: z.string(),
  })),
})

const ocorrencia = computed(() => dados.value?.ocorrencia ?? null)
const podeEditarConteudo = computed(() => Boolean(
  ocorrencia.value && (
    auth.papel === 'admin'
    || auth.papel === 'engenharia'
    || auth.usuario?.id === ocorrencia.value.relatado_por
  ),
))
const podeGerenciar = computed(() => auth.papel === 'admin' || auth.papel === 'engenharia')
const transicoes: Record<string, Array<{ value: string; label: string }>> = {
  aberta: [{ value: 'em_analise', label: 'Analisar' }, { value: 'descartada', label: 'Descartada' }],
  em_analise: [{ value: 'aberta', label: 'Erro' }, { value: 'resolvida', label: 'Concluída' }, { value: 'descartada', label: 'Descartada' }],
  resolvida: [{ value: 'em_analise', label: 'Reabrir · Analisar' }],
  descartada: [{ value: 'em_analise', label: 'Reabrir · Analisar' }],
}
const opcoesStatus = computed(() => [
  { value: ocorrencia.value?.status ?? status.value, label: 'Manter status atual' },
  ...(transicoes[ocorrencia.value?.status ?? 'aberta'] ?? []),
])
const timeline = computed(() => {
  const comentarios = (dados.value?.comentarios ?? []).map(item => ({
    id: `comentario-${item.id}`,
    tipo: 'comentario' as const,
    usuario_nome: item.usuario_nome,
    texto: item.texto,
    criado_em: item.criado_em,
  }))
  const historico = (dados.value?.historico ?? []).map(item => {
    const antes = item.antes ?? {}
    const depois = item.depois ?? {}
    const mudancas: string[] = []
    if (antes.status !== depois.status && depois.status) mudancas.push(`Status: ${rotuloStatus(String(antes.status))} → ${rotuloStatus(String(depois.status))}`)
    if (antes.responsavel_id !== depois.responsavel_id) mudancas.push(`Responsável: ${antes.responsavel_id ? 'alterado' : 'não atribuído'} → ${depois.responsavel_id ? 'atribuído' : 'não atribuído'}`)
    return {
      id: `historico-${item.id}`,
      tipo: 'historico' as const,
      usuario_nome: item.usuario_nome ?? 'Usuário removido',
      texto: mudancas.join(' · ') || 'Fluxo da ocorrência atualizado',
      criado_em: item.criado_em,
    }
  })
  return [...comentarios, ...historico].sort((a, b) => a.criado_em.localeCompare(b.criado_em))
})

function rotuloStatus(value: string) {
  return ({ aberta: 'Erro', em_analise: 'Analisar', resolvida: 'Concluída', descartada: 'Descartada' } as Record<string, string>)[value] ?? value
}
function rotuloGravidade(value: string) {
  return ({ baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: 'Crítica' } as Record<string, string>)[value] ?? value
}
function formatarData(value: string) {
  const date = new Date(value.replace(' ', 'T') + (value.includes('Z') ? '' : 'Z'))
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
function urlAnexo(anexoId: string) {
  return `/api/ocorrencias/${id.value}/anexos/${anexoId}`
}
function tamanhoLegivel(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

async function carregar() {
  carregando.value = true
  erro.value = ''
  try {
    const [resposta, lista] = await Promise.all([
      $fetch<unknown>(`/api/ocorrencias/${id.value}`),
      $fetch<unknown>('/api/ocorrencias', { query: { limite: 1 } }),
    ])
    const validado = respostaSchema.safeParse(resposta)
    const responsaveisResposta = z.object({
      responsaveis: z.array(z.object({ id: z.string().uuid(), nome: z.string() })),
    }).safeParse(lista)
    if (!validado.success || !responsaveisResposta.success) throw new Error('Os dados recebidos estão em formato inválido.')
    dados.value = validado.data
    responsaveis.value = responsaveisResposta.data.responsaveis
    tipoTeste.value = validado.data.ocorrencia.tipo_teste ?? ''
    titulo.value = validado.data.ocorrencia.titulo
    descricao.value = validado.data.ocorrencia.descricao
    gravidade.value = validado.data.ocorrencia.gravidade
    status.value = validado.data.ocorrencia.status
    responsavelId.value = validado.data.ocorrencia.responsavel_id ?? ''
    resolucao.value = validado.data.ocorrencia.resolucao ?? ''
  } catch (error: unknown) {
    erro.value = mensagemDeErro(error, 'Não foi possível carregar esta ocorrência.')
  } finally {
    carregando.value = false
  }
}

async function salvarConteudo() {
  if (!ocorrencia.value) return
  salvando.value = true
  erro.value = ''
  try {
    await $fetch(`/api/ocorrencias/${id.value}`, {
      method: 'PATCH',
      body: { tipoTeste: tipoTeste.value, titulo: titulo.value, descricao: descricao.value, gravidade: gravidade.value },
    })
    editando.value = false
    await carregar()
  } catch (error: unknown) {
    erro.value = mensagemDeErro(error, 'Não foi possível atualizar o conteúdo.')
  } finally {
    salvando.value = false
  }
}

async function salvarFluxo() {
  if (!ocorrencia.value) return
  salvando.value = true
  erro.value = ''
  try {
    await $fetch(`/api/ocorrencias/${id.value}`, {
      method: 'PATCH',
      body: {
        ...(status.value !== ocorrencia.value.status ? { status: status.value } : {}),
        ...(responsavelId.value !== (ocorrencia.value.responsavel_id ?? '') ? { responsavelId: responsavelId.value || null } : {}),
        ...(resolucao.value !== (ocorrencia.value.resolucao ?? '') ? { resolucao: resolucao.value || null } : {}),
      },
    })
    await carregar()
  } catch (error: unknown) {
    erro.value = mensagemDeErro(error, 'Não foi possível atualizar o fluxo.')
  } finally {
    salvando.value = false
  }
}

async function enviarComentario() {
  if (!comentario.value.trim()) return
  enviandoComentario.value = true
  erro.value = ''
  try {
    await $fetch(`/api/ocorrencias/${id.value}/comentarios`, {
      method: 'POST',
      body: { texto: comentario.value },
    })
    comentario.value = ''
    await carregar()
  } catch (error: unknown) {
    erro.value = mensagemDeErro(error, 'Não foi possível registrar o comentário.')
  } finally {
    enviandoComentario.value = false
  }
}

async function excluirAnexo(anexoId: string, nome: string) {
  if (!window.confirm(`Excluir o anexo “${nome}”?`)) return
  anexoRemovendo.value = anexoId
  erro.value = ''
  try {
    await $fetch(urlAnexo(anexoId), { method: 'DELETE' })
    await carregar()
  } catch (error: unknown) {
    erro.value = mensagemDeErro(error, 'Não foi possível excluir o anexo.')
  } finally {
    anexoRemovendo.value = ''
  }
}

function podeExcluir(anexo: { enviado_por: string }) {
  return Boolean(ocorrencia.value && (
    auth.papel === 'admin'
    || auth.papel === 'engenharia'
    || auth.usuario?.id === ocorrencia.value.relatado_por
  ))
}

onMounted(() => void carregar())
</script>

<template>
  <AppShell :title="ocorrencia?.titulo || 'Detalhe da ocorrência'" description="Acompanhe o relato, evidências e a linha do tempo de resolução.">
    <template #actions>
      <NuxtLink :to="voltarPara" class="interactive inline-flex min-h-10 items-center gap-2 rounded-control border border-border bg-surface px-3 text-xs font-semibold hover:bg-surface-raised">
        <ArrowLeft :size="14" aria-hidden="true" /> Voltar à lista
      </NuxtLink>
      <UiButton variant="secondary" size="sm" :loading="carregando" @click="carregar"><template #icon><RefreshCw :size="14" aria-hidden="true" /></template>Atualizar</UiButton>
    </template>

    <AppAlert v-if="erro" tone="error" class="mb-4">{{ erro }}</AppAlert>
    <UiCard v-if="carregando"><UiSkeleton variant="heading" /><div class="mt-5"><UiSkeleton variant="block" /></div></UiCard>

    <template v-else-if="dados && ocorrencia">
      <section class="surface-card p-4 sm:p-6">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <OcorrenciaStatusBadge :status="ocorrencia.status" />
              <UiBadge :tone="ocorrencia.gravidade === 'critica' || ocorrencia.gravidade === 'alta' ? 'danger' : ocorrencia.gravidade === 'media' ? 'warning' : 'neutral'">
                <AlertTriangle :size="13" aria-hidden="true" />{{ rotuloGravidade(ocorrencia.gravidade) }}
              </UiBadge>
            </div>
            <h2 class="mt-3 break-words text-xl font-bold tracking-tight">{{ ocorrencia.titulo }}</h2>
            <p class="mt-2 text-sm font-semibold">
              <NuxtLink :to="`/codigos/${ocorrencia.codigo_id}`" class="font-mono text-primary hover:underline">{{ ocorrencia.codigo }}</NuxtLink>
              <span class="font-normal text-foreground-muted"> · {{ ocorrencia.marca }} {{ ocorrencia.modelo }}</span>
            </p>
          </div>
          <div class="text-xs text-foreground-muted">
            <p class="inline-flex items-center gap-1.5"><CalendarDays :size="13" aria-hidden="true" /> Criada {{ formatarData(ocorrencia.criado_em) }}</p>
            <p class="mt-2 inline-flex items-center gap-1.5"><UserRound :size="13" aria-hidden="true" /> Relatada por {{ ocorrencia.relator_nome }}</p>
          </div>
        </div>
        <div v-if="ocorrencia.tipo_teste || ocorrencia.teste_resumo || ocorrencia.teste_item_nome || ocorrencia.codigo_item_nome" class="mt-4 rounded-control border border-border bg-surface-raised p-3 text-xs">
          <p class="font-semibold">Vínculo técnico</p>
          <p v-if="ocorrencia.tipo_teste" class="mt-1 text-foreground-muted">Tipo de Teste: {{ ocorrencia.tipo_teste }}</p>
          <p v-if="ocorrencia.teste_resumo" class="mt-1 text-foreground-muted">{{ ocorrencia.teste_resumo }}<span v-if="ocorrencia.teste_item_nome"> · {{ ocorrencia.teste_item_nome }}</span></p>
          <p v-if="ocorrencia.codigo_item_nome" class="mt-1 text-foreground-muted">Item do código: {{ ocorrencia.codigo_item_nome }}</p>
        </div>

        <div class="mt-5 border-t border-border pt-4">
          <div class="flex items-center justify-between gap-3">
            <h3 class="text-xs font-bold uppercase tracking-wide text-foreground-subtle">Descrição</h3>
            <UiButton v-if="podeEditarConteudo && !editando" variant="ghost" size="sm" @click="editando = true">Editar conteúdo</UiButton>
          </div>
          <template v-if="editando">
            <div class="mt-4 space-y-4">
              <UiField id="editar-ocorrencia-tipo-teste" v-model="tipoTeste" label="Tipo de Teste" maxlength="120" />
              <UiField id="editar-ocorrencia-titulo" v-model="titulo" label="Título" maxlength="180" />
              <label class="block space-y-2 text-sm font-semibold">Descrição<textarea v-model="descricao" rows="6" maxlength="10000" class="interactive w-full rounded-control border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" /></label>
              <UiSelect id="editar-ocorrencia-gravidade" v-model="gravidade" label="Gravidade" :options="[{ value: 'baixa', label: 'Baixa' }, { value: 'media', label: 'Média' }, { value: 'alta', label: 'Alta' }, { value: 'critica', label: 'Crítica' }]" />
              <div class="flex justify-end gap-2"><UiButton variant="secondary" size="sm" @click="editando = false">Cancelar</UiButton><UiButton variant="primary" size="sm" :loading="salvando" @click="salvarConteudo"><template #icon><Check :size="14" aria-hidden="true" /></template>Salvar conteúdo</UiButton></div>
            </div>
          </template>
          <p v-else class="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-foreground-muted">{{ ocorrencia.descricao }}</p>
        </div>
      </section>

      <ErrorTestsSection class="mt-5" :ocorrencia-id="ocorrencia.id" :responsaveis="responsaveis" />

      <div class="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div class="space-y-5">
          <section class="surface-card p-4 sm:p-5">
            <div class="flex items-center justify-between gap-3">
              <div><h2 class="text-sm font-bold">Anexos</h2><p class="mt-1 text-xs text-foreground-muted">{{ dados.anexos.length }} arquivo(s) privado(s)</p></div>
              <Paperclip :size="17" class="text-primary" aria-hidden="true" />
            </div>
            <div v-if="!dados.anexos.length" class="mt-4 rounded-control border border-dashed border-border p-5 text-center text-xs text-foreground-subtle">Nenhum anexo nesta ocorrência.</div>
            <ul v-else class="mt-4 grid gap-3 sm:grid-cols-2">
              <li v-for="anexo in dados.anexos" :key="anexo.id" class="overflow-hidden rounded-card border border-border bg-surface">
                <div v-if="anexo.status_upload === 'enviando'" class="grid min-h-36 place-items-center bg-warning-surface p-4 text-center">
                  <div><LoaderCircle :size="22" class="mx-auto animate-spin text-warning" aria-hidden="true" /><p class="mt-2 text-xs font-semibold">Envio incompleto</p><p class="mt-1 text-[10px] text-foreground-muted">Reenvie o arquivo pela tela de criação ou exclua este envio.</p></div>
                </div>
                <a v-else-if="anexo.tipo_mime.startsWith('image/')" :href="urlAnexo(anexo.id)" target="_blank" rel="noopener" class="block bg-surface-raised">
                  <img :src="urlAnexo(anexo.id)" :alt="`Prévia: ${anexo.nome_original}`" loading="lazy" class="h-48 w-full object-contain">
                </a>
                <video v-else-if="anexo.tipo_mime === 'video/mp4'" :src="urlAnexo(anexo.id)" controls preload="metadata" class="max-h-64 w-full bg-black" :aria-label="anexo.nome_original" />
                <a v-else :href="urlAnexo(anexo.id)" target="_blank" rel="noopener" class="flex min-h-36 flex-col items-center justify-center gap-2 bg-surface-raised px-4 text-center hover:bg-info-surface">
                  <FileText :size="26" class="text-primary" aria-hidden="true" /><span class="text-xs font-semibold">Visualizar / baixar</span>
                </a>
                <div class="flex items-start gap-2 border-t border-border p-3">
                  <div class="min-w-0 flex-1"><p class="break-all text-xs font-semibold">{{ anexo.nome_original }}</p><p class="mt-1 text-[10px] text-foreground-subtle">{{ tamanhoLegivel(anexo.tamanho_bytes) }} · {{ formatarData(anexo.criado_em) }}</p></div>
                  <a :href="urlAnexo(anexo.id)" :download="anexo.nome_original" class="rounded-control p-2 text-foreground-subtle hover:bg-surface-raised hover:text-primary" :aria-label="`Baixar ${anexo.nome_original}`"><Download :size="14" aria-hidden="true" /></a>
                  <button v-if="podeExcluir(anexo)" type="button" class="rounded-control p-2 text-foreground-subtle hover:bg-danger-surface hover:text-danger" :disabled="anexoRemovendo === anexo.id" :aria-label="`Excluir ${anexo.nome_original}`" @click="excluirAnexo(anexo.id, anexo.nome_original)"><LoaderCircle v-if="anexoRemovendo === anexo.id" :size="14" class="animate-spin" aria-hidden="true" /><Trash2 v-else :size="14" aria-hidden="true" /></button>
                </div>
              </li>
            </ul>
          </section>

          <section class="surface-card p-4 sm:p-5">
            <div class="flex items-center gap-2"><MessageSquare :size="16" class="text-primary" aria-hidden="true" /><h2 class="text-sm font-bold">Comentários e histórico</h2></div>
            <form class="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end" @submit.prevent="enviarComentario">
              <label class="min-w-0 flex-1 space-y-2 text-xs font-semibold">
                <span>Adicionar comentário</span>
                <textarea v-model="comentario" maxlength="4000" rows="2" placeholder="Compartilhe uma atualização..." class="interactive w-full rounded-control border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" />
              </label>
              <UiButton variant="primary" size="sm" :loading="enviandoComentario" :disabled="!comentario.trim()"><template #icon><Send :size="14" aria-hidden="true" /></template>Comentar</UiButton>
            </form>
            <ol v-if="timeline.length" class="mt-5 space-y-4">
              <li v-for="item in timeline" :key="item.id" class="relative flex gap-3">
                <span class="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full" :class="item.tipo === 'comentario' ? 'bg-info-surface text-info' : 'bg-warning-surface text-warning'">
                  <MessageSquare v-if="item.tipo === 'comentario'" :size="14" aria-hidden="true" /><RefreshCw v-else :size="14" aria-hidden="true" />
                </span>
                <div class="min-w-0 flex-1 rounded-control border border-border bg-surface-raised p-3">
                  <div class="flex flex-wrap items-center justify-between gap-2"><p class="text-xs font-semibold">{{ item.usuario_nome }}</p><time class="text-[10px] text-foreground-subtle">{{ formatarData(item.criado_em) }}</time></div>
                  <p class="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-foreground-muted">{{ item.texto }}</p>
                </div>
              </li>
            </ol>
            <p v-else class="mt-4 text-xs text-foreground-subtle">Ainda não há comentários ou mudanças de fluxo.</p>
          </section>
        </div>

        <aside v-if="podeGerenciar" class="surface-card p-4 sm:p-5 xl:sticky xl:top-20">
          <h2 class="text-sm font-bold">Ações de engenharia</h2>
          <p class="mt-1 text-xs leading-5 text-foreground-muted">Status, responsável e resolução são registrados no histórico.</p>
          <div class="mt-4 space-y-4">
            <UiSelect id="ocorrencia-status" v-model="status" label="Status" :options="opcoesStatus" />
            <UiSelect id="ocorrencia-responsavel" v-model="responsavelId" label="Responsável" :options="[{ value: '', label: 'Não atribuído' }, ...responsaveis.map(item => ({ value: item.id, label: item.nome }))]" />
            <label class="block space-y-2 text-sm font-semibold">Resolução<textarea v-model="resolucao" rows="5" maxlength="10000" placeholder="Descreva a causa e a solução aplicada." class="interactive w-full rounded-control border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" /></label>
            <AppAlert v-if="status === 'resolvida' && !resolucao.trim()" tone="warning">Para resolver, preencha a descrição da resolução.</AppAlert>
            <UiButton variant="primary" class="w-full" :loading="salvando" :disabled="status === 'resolvida' && !resolucao.trim()" @click="salvarFluxo">
              <template #icon><CheckCircle2 :size="14" aria-hidden="true" /></template>Salvar fluxo
            </UiButton>
            <p v-if="ocorrencia.resolvido_em" class="text-[10px] text-foreground-subtle">Resolvida em {{ formatarData(ocorrencia.resolvido_em) }}</p>
          </div>
        </aside>
        <aside v-else class="surface-card p-4 sm:p-5">
          <h2 class="text-sm font-bold">Acompanhamento</h2>
          <p class="mt-2 text-xs leading-5 text-foreground-muted">Responsável: {{ ocorrencia.responsavel_nome || 'Não atribuído' }}</p>
          <p v-if="ocorrencia.resolucao" class="mt-3 whitespace-pre-wrap text-xs leading-5 text-foreground-muted">{{ ocorrencia.resolucao }}</p>
        </aside>
      </div>
    </template>
  </AppShell>
</template>
