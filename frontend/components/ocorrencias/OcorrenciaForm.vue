<script setup lang="ts">
import { AlertTriangle, Camera, CheckCircle2, FilePlus2, LoaderCircle, Paperclip, Trash2, Upload } from '@lucide/vue'
import { MAXIMO_ANEXOS_POR_OCORRENCIA, TAMANHO_MAXIMO_ANEXO_BYTES, TAMANHO_PARTE_ANEXO_BYTES } from '@backend/services/ocorrencias-config'
import { ref, watch } from 'vue'
import { z } from 'zod'

const props = withDefaults(defineProps<{
  codigoInicial?: string
  testeInicial?: string
  testeItemInicial?: string
  codigoItemInicial?: string
  tipoTesteInicial?: string
  tituloInicial?: string
  descricaoInicial?: string
  voltarPara?: string
}>(), {
  codigoInicial: '',
  testeInicial: '',
  testeItemInicial: '',
  codigoItemInicial: '',
  tipoTesteInicial: '',
  tituloInicial: '',
  descricaoInicial: '',
  voltarPara: '/ocorrencias',
})

const emit = defineEmits<{ criada: [id: string] }>()
const codigoId = ref(props.codigoInicial)
const testeId = ref(props.testeInicial)
const testeItemId = ref(props.testeItemInicial)
const codigoItemId = ref(props.codigoItemInicial)
<<<<<<< HEAD
const tipoTesteInicial = props.tipoTesteInicial.toLocaleLowerCase('pt-BR')
const tipoTeste = ref<'bancada' | 'campo' | ''>(
  tipoTesteInicial === 'bancada' || tipoTesteInicial === 'campo' ? tipoTesteInicial : '',
)
=======
const tipoTeste = ref(props.tipoTesteInicial)
>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3
const titulo = ref(props.tituloInicial)
const descricao = ref(props.descricaoInicial)
const gravidade = ref<'baixa' | 'media' | 'alta' | 'critica'>('media')
const status = ref<'aberta' | 'em_analise' | 'analisar_erro_informado' | 'resolvida'>('aberta')
const anexos = ref<Array<{
  id: string
  arquivo: File
  estado: 'aguardando' | 'enviando' | 'enviado' | 'erro'
  enviadoBytes: number
  anexoId: string | null
}>>([])
const codigoBusca = ref('')
const codigos = ref<Array<{ id: string; codigo: string; marca: string; modelo: string }>>([])
const enviando = ref(false)
const erro = ref('')
const ocorrenciaId = ref('')
const erroArquivo = ref('')
const areaDrop = ref(false)

const tiposMime: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.txt': 'text/plain',
  '.log': 'text/plain',
}

function nomeExtensao(nome: string) {
  const ext = nome.toLocaleLowerCase('pt-BR').match(/\.[^.]+$/)?.[0] ?? ''
  return ext
}

async function validarArquivoNoCliente(arquivo: File): Promise<string | null> {
  const extensao = nomeExtensao(arquivo.name)
  const mimeEsperado = tiposMime[extensao]
  if (!mimeEsperado) return 'Tipo não permitido. Use PNG, JPG, WEBP, PDF, MP4, TXT ou LOG.'
  if (arquivo.size < 1 || arquivo.size > TAMANHO_MAXIMO_ANEXO_BYTES) return 'Cada arquivo deve ter até 10 MB.'
  const bytes = new Uint8Array(await arquivo.slice(0, Math.min(arquivo.size, 4096)).arrayBuffer())
  if (mimeEsperado === 'image/png' && !(bytes[0] === 0x89 && String.fromCharCode(...bytes.slice(1, 4)) === 'PNG')) return 'O conteúdo não corresponde a uma imagem PNG.'
  if (mimeEsperado === 'image/jpeg' && !(bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)) return 'O conteúdo não corresponde a uma imagem JPG.'
  if (mimeEsperado === 'image/webp' && !(String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP')) return 'O conteúdo não corresponde a uma imagem WEBP.'
  if (mimeEsperado === 'application/pdf' && String.fromCharCode(...bytes.slice(0, 5)) !== '%PDF-') return 'O conteúdo não corresponde a um PDF.'
  if (mimeEsperado === 'video/mp4' && String.fromCharCode(...bytes.slice(4, 8)) !== 'ftyp') return 'O conteúdo não corresponde a um vídeo MP4.'
  if (mimeEsperado === 'text/plain') {
    if (bytes.includes(0)) return 'O arquivo de texto parece conter dados binários.'
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(bytes, { stream: true })
    } catch {
      return 'O arquivo de texto deve estar codificado em UTF-8.'
    }
  }
  return null
}

async function adicionarArquivos(files: FileList | File[]) {
  erroArquivo.value = ''
  for (const arquivo of Array.from(files)) {
    if (anexos.value.length >= MAXIMO_ANEXOS_POR_OCORRENCIA) {
      erroArquivo.value = `Cada ocorrência pode ter no máximo ${MAXIMO_ANEXOS_POR_OCORRENCIA} anexos.`
      break
    }
    if (anexos.value.some(anexo => anexo.arquivo.name === arquivo.name && anexo.arquivo.size === arquivo.size)) continue
    const erroValidacao = await validarArquivoNoCliente(arquivo)
    if (erroValidacao) {
      erroArquivo.value = `${arquivo.name}: ${erroValidacao}`
      continue
    }
    anexos.value.push({
      id: crypto.randomUUID(),
      arquivo,
      estado: 'aguardando',
      enviadoBytes: 0,
      anexoId: null,
    })
  }
}

function removerArquivo(id: string) {
  anexos.value = anexos.value.filter(anexo => anexo.id !== id || anexo.estado === 'enviando')
}

async function carregarCodigos(termo = '') {
  try {
    const resposta = z.object({
      codigos: z.array(z.object({
        id: z.string().uuid(),
        codigo: z.string(),
        marca: z.string(),
        modelo: z.string(),
      })),
    }).safeParse(await $fetch<unknown>('/api/codigos', {
      query: { busca: termo, pagina: 1, limite: 50, ordenar: 'codigo', direcao: 'asc' },
    }))
    if (!resposta.success) throw new Error('A lista de códigos está em formato inválido.')
    codigos.value = resposta.data.codigos
  } catch (error: unknown) {
    erro.value = mensagemDeErro(error, 'Não foi possível carregar os códigos.')
  }
}

let timerBusca: ReturnType<typeof setTimeout> | undefined
watch(codigoBusca, (termo: string) => {
  if (timerBusca) clearTimeout(timerBusca)
  timerBusca = setTimeout(() => void carregarCodigos(termo), 250)
})

async function carregarCodigoSelecionado(id: string) {
  if (!id || codigos.value.some(codigo => codigo.id === id)) return
  try {
    const resposta = z.object({
      codigo: z.object({
        id: z.string().uuid(),
        codigo: z.string(),
        marca: z.string(),
        modelo: z.string(),
      }),
    }).safeParse(await $fetch<unknown>(`/api/codigos/${id}`))
    if (resposta.success) codigos.value.unshift(resposta.data.codigo)
    else erro.value = 'O código associado retornou dados inválidos.'
  } catch {
    erro.value = 'O código associado não pôde ser carregado.'
  }
}

watch(codigoId, (id: string) => void carregarCodigoSelecionado(id))

function base64DoArquivoParte(arquivo: File, inicio: number, fim: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Falha ao ler uma parte do arquivo.'))
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '')
      const conteudo = dataUrl.slice(dataUrl.indexOf(',') + 1)
      if (!conteudo) reject(new Error('Não foi possível codificar a parte do arquivo.'))
      else resolve(conteudo)
    }
    reader.readAsDataURL(arquivo.slice(inicio, fim))
  })
}

async function enviarAnexo(item: (typeof anexos.value)[number], idOcorrencia: string) {
  const totalPartes = Math.ceil(item.arquivo.size / TAMANHO_PARTE_ANEXO_BYTES)
  if (!item.anexoId) {
    const iniciado = z.object({
      id: z.string().uuid(),
      tamanhoParte: z.number().int().positive(),
    }).safeParse(await $fetch<unknown>(`/api/ocorrencias/${idOcorrencia}/anexos`, {
      method: 'POST',
      body: {
        nomeOriginal: item.arquivo.name,
        tipoMime: tiposMime[nomeExtensao(item.arquivo.name)],
        tamanhoBytes: item.arquivo.size,
        totalPartes,
      },
    }))
    if (!iniciado.success) throw new Error('O servidor retornou dados inválidos para o envio do anexo.')
    item.anexoId = iniciado.data.id
  }

  item.estado = 'enviando'
  while (item.enviadoBytes < item.arquivo.size) {
    const numeroParte = Math.floor(item.enviadoBytes / TAMANHO_PARTE_ANEXO_BYTES)
    const inicio = numeroParte * TAMANHO_PARTE_ANEXO_BYTES
    const fim = Math.min(inicio + TAMANHO_PARTE_ANEXO_BYTES, item.arquivo.size)
    const conteudoBase64 = await base64DoArquivoParte(item.arquivo, inicio, fim)
    await $fetch(`/api/ocorrencias/${idOcorrencia}/anexos/${item.anexoId}/partes/${numeroParte}`, {
      method: 'PUT',
      body: { conteudoBase64 },
    })
    item.enviadoBytes = fim
  }
  item.estado = 'enviado'
}

async function criarEEnviar() {
  if (!codigoId.value || !tipoTeste.value.trim() || !titulo.value.trim() || !descricao.value.trim()) {
    erro.value = 'Informe o código, o tipo de teste, o título e a descrição da ocorrência.'
    return
  }
  enviando.value = true
  erro.value = ''
  try {
    if (!ocorrenciaId.value) {
      const criada = z.object({ id: z.string().uuid() }).safeParse(await $fetch<unknown>('/api/ocorrencias', {
        method: 'POST',
        body: {
          codigoId: codigoId.value,
          ...(testeId.value ? { testeId: testeId.value } : {}),
          ...(testeItemId.value ? { testeItemId: testeItemId.value } : {}),
          ...(codigoItemId.value ? { codigoItemId: codigoItemId.value } : {}),
          tipoTeste: tipoTeste.value,
          titulo: titulo.value,
          descricao: descricao.value,
          gravidade: gravidade.value,
          status: status.value === 'analisar_erro_informado' ? 'em_analise' : status.value,
        },
      }))
      if (!criada.success) throw new Error('A ocorrência foi criada, mas a resposta recebida é inválida.')
      ocorrenciaId.value = criada.data.id
      emit('criada', criada.data.id)
    }
    for (const item of anexos.value) {
      if (item.estado === 'enviado') continue
      try {
        await enviarAnexo(item, ocorrenciaId.value)
      } catch (error: unknown) {
        item.estado = 'erro'
        throw error
      }
    }
    await navigateTo(`/ocorrencias/${ocorrenciaId.value}`)
  } catch (error: unknown) {
    erro.value = mensagemDeErro(error, ocorrenciaId.value
      ? 'A ocorrência foi salva, mas um anexo não foi enviado. Tente novamente sem perder o texto.'
      : 'Não foi possível salvar a ocorrência.')
  } finally {
    enviando.value = false
  }
}

onMounted(async () => {
  await carregarCodigos()
  await carregarCodigoSelecionado(codigoId.value)
})
onBeforeUnmount(() => {
  if (timerBusca) clearTimeout(timerBusca)
})
</script>

<template>
  <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
    <section class="surface-card space-y-5 p-4 sm:p-6">
<<<<<<< HEAD
      <div v-if="!codigoInicial" class="grid gap-4 sm:grid-cols-2">
=======
      <div class="grid gap-4 sm:grid-cols-2">
>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3
        <UiField id="ocorrencia-codigo-busca" v-model="codigoBusca" label="Buscar código" placeholder="Digite código, marca ou modelo" />
        <UiSelect
          id="ocorrencia-codigo"
          v-model="codigoId"
          label="Código do veículo"
          :options="[
            { value: '', label: 'Selecione um código' },
            ...codigos.map(item => ({ value: item.id, label: `${item.codigo} · ${item.marca} ${item.modelo}` })),
          ]"
        />
      </div>
      <div v-if="testeId" class="rounded-control border border-info/20 bg-info-surface/50 p-3 text-xs text-info">
        Ocorrência vinculada ao teste. O item selecionado deve estar reprovado.
      </div>
<<<<<<< HEAD
      <UiSelect
        id="ocorrencia-tipo-teste"
        v-model="tipoTeste"
        label="Tipo de Teste"
        :options="[
          { value: '', label: 'Selecione o tipo de teste' },
          { value: 'bancada', label: 'Bancada' },
          { value: 'campo', label: 'Campo' },
        ]"
      />
=======
      <UiField id="ocorrencia-tipo-teste" v-model="tipoTeste" label="Tipo de Teste" placeholder="Informe o tipo de teste" maxlength="120" />
>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3
      <UiField id="ocorrencia-titulo" v-model="titulo" label="Título" placeholder="Resuma o erro observado" maxlength="180" />
      <div class="space-y-2">
        <label for="ocorrencia-descricao" class="block text-sm font-semibold">Descrição</label>
        <textarea id="ocorrencia-descricao" v-model="descricao" rows="7" maxlength="10000" placeholder="Descreva as condições, etapas para reproduzir e o resultado observado." class="interactive w-full rounded-control border border-border bg-surface px-3.5 py-3 text-sm leading-6 placeholder:text-foreground-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" />
        <p class="text-right text-[10px] text-foreground-subtle">{{ descricao.length }}/10.000</p>
      </div>
      <UiSelect
        id="ocorrencia-status"
        v-model="status"
        label="Status"
        :options="[
          { value: 'resolvida', label: 'Concluída' },
          { value: 'em_analise', label: 'Analisar' },
          { value: 'aberta', label: 'Erro' },
          { value: 'analisar_erro_informado', label: 'Analisar erro informado' },
        ]"
      />
      <UiSelect
        id="ocorrencia-gravidade"
        v-model="gravidade"
        label="Gravidade"
        :options="[
          { value: 'baixa', label: 'Baixa' },
          { value: 'media', label: 'Média' },
          { value: 'alta', label: 'Alta' },
          { value: 'critica', label: 'Crítica' },
        ]"
      />
      <AppAlert v-if="erro" tone="error">{{ erro }}</AppAlert>
      <div class="flex flex-wrap justify-end gap-2">
        <NuxtLink :to="voltarPara" class="interactive inline-flex min-h-10 items-center rounded-control border border-border px-4 text-sm font-semibold hover:bg-surface-raised">Cancelar</NuxtLink>
        <UiButton variant="primary" :loading="enviando" @click="criarEEnviar">
          <template #icon><FilePlus2 :size="15" aria-hidden="true" /></template>
          {{ ocorrenciaId ? 'Tentar enviar novamente' : 'Registrar ocorrência' }}
        </UiButton>
      </div>
    </section>

    <aside class="space-y-4">
      <section
        class="surface-card p-4 sm:p-5"
        :class="areaDrop ? 'border-primary bg-info-surface/40' : ''"
        @dragover.prevent="areaDrop = true"
        @dragleave.prevent="areaDrop = false"
        @drop.prevent="areaDrop = false; adicionarArquivos($event.dataTransfer?.files ?? [])"
      >
        <div class="flex items-center gap-2">
          <Paperclip :size="16" class="text-primary" aria-hidden="true" />
          <h2 class="text-sm font-bold">Anexos</h2>
          <UiBadge class="ml-auto" tone="neutral">{{ anexos.length }}/{{ MAXIMO_ANEXOS_POR_OCORRENCIA }}</UiBadge>
        </div>
        <p class="mt-2 text-xs leading-5 text-foreground-muted">Imagens, PDF, MP4, TXT ou LOG · até 10 MB por arquivo. Os dados ficam armazenados no D1.</p>
        <div class="mt-4 grid grid-cols-2 gap-2">
          <label class="interactive inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-control border border-border bg-surface px-2 text-xs font-semibold hover:bg-surface-raised">
            <Upload :size="14" aria-hidden="true" /> Escolher arquivos
            <input class="sr-only" type="file" multiple accept=".png,.jpg,.jpeg,.webp,.pdf,.mp4,.txt,.log" :disabled="enviando || anexos.length >= MAXIMO_ANEXOS_POR_OCORRENCIA" @change="adicionarArquivos(($event.target as HTMLInputElement).files ?? []); ($event.target as HTMLInputElement).value = ''">
          </label>
          <label class="interactive inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-control border border-border bg-surface px-2 text-xs font-semibold hover:bg-surface-raised">
            <Camera :size="14" aria-hidden="true" /> Tirar foto
            <input class="sr-only" type="file" accept="image/*" capture="environment" :disabled="enviando || anexos.length >= MAXIMO_ANEXOS_POR_OCORRENCIA" @change="adicionarArquivos(($event.target as HTMLInputElement).files ?? []); ($event.target as HTMLInputElement).value = ''">
          </label>
        </div>
        <p v-if="erroArquivo" role="alert" class="mt-3 text-xs font-medium text-danger">{{ erroArquivo }}</p>
        <ul v-if="anexos.length" class="mt-4 space-y-2">
          <li v-for="item in anexos" :key="item.id" class="rounded-control border border-border bg-surface-raised p-3">
            <div class="flex items-start gap-2">
              <FilePlus2 :size="15" class="mt-0.5 shrink-0 text-foreground-subtle" aria-hidden="true" />
              <div class="min-w-0 flex-1">
                <p class="break-all text-xs font-semibold">{{ item.arquivo.name }}</p>
                <p class="mt-1 text-[10px] text-foreground-muted">{{ (item.arquivo.size / 1024 / 1024).toFixed(2) }} MB · {{ item.estado === 'enviado' ? 'Enviado' : item.estado === 'enviando' ? 'Enviando' : item.estado === 'erro' ? 'Falhou' : 'Aguardando' }}</p>
                <div v-if="item.estado === 'enviando' || item.estado === 'enviado'" class="mt-2 h-1.5 overflow-hidden rounded-full bg-border" role="progressbar" :aria-valuenow="Math.round(item.enviadoBytes / item.arquivo.size * 100)" aria-valuemin="0" aria-valuemax="100">
                  <div class="h-full rounded-full bg-primary" :style="{ width: `${Math.round(item.enviadoBytes / item.arquivo.size * 100)}%` }" />
                </div>
              </div>
              <CheckCircle2 v-if="item.estado === 'enviado'" :size="15" class="text-success" aria-label="Arquivo enviado" />
              <LoaderCircle v-else-if="item.estado === 'enviando'" :size="15" class="animate-spin text-primary" aria-label="Enviando arquivo" />
              <button v-else type="button" class="rounded p-1 text-foreground-subtle hover:bg-danger-surface hover:text-danger" :aria-label="`Remover ${item.arquivo.name}`" @click="removerArquivo(item.id)"><Trash2 :size="14" aria-hidden="true" /></button>
            </div>
          </li>
        </ul>
        <p v-else class="mt-4 rounded-control border border-dashed border-border p-4 text-center text-xs text-foreground-subtle">
          <AlertTriangle :size="15" class="mx-auto mb-1" aria-hidden="true" />Arraste arquivos para esta área ou selecione no dispositivo.
        </p>
      </section>
      <p class="px-1 text-[11px] leading-5 text-foreground-subtle">Arquivos são verificados pelo conteúdo e ficam disponíveis apenas por uma rota autenticada.</p>
    </aside>
  </div>
</template>
