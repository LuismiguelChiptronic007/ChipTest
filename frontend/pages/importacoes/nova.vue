<script setup lang="ts">
import { ArrowLeft, ArrowRight, Check, FileText, Search, ShieldAlert, Upload } from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { codigoSchema } from '@backend/schemas/codigos'
import { criarImportacaoSchema, tipoSecaoImportacaoSchema, type TipoSecaoImportacao } from '@backend/schemas/importacoes'
import type { CodigoListItem } from '@backend/services/codigos'

interface TipoSecao {
  tipo: TipoSecaoImportacao
  titulo: string
}

interface ItemImportado {
  id: string
  nomeCompleto: string
  nomeOriginal: string
  nomePt: string | null
  ordem: number
}

interface SecaoImportada {
  id: string
  tituloOriginal: string
  tipoSecao: TipoSecaoImportacao | null
  status: 'reconhecida' | 'nao_identificada' | 'fora_escopo'
  itens: ItemImportado[]
  acao: 'importar' | 'ignorar'
}

interface ItemExistente {
  id: string
  tipo_secao: TipoSecaoImportacao
  nome_completo: string
  nome_original: string
  nome_pt: string | null
  ordem: number
  versao: number
  atualizado_em: string
}

interface ItemResumo {
  tipo_secao: TipoSecaoImportacao
  nome_completo: string
  ocorrencia: number
}

interface ResumoConfirmacao {
  novos: ItemResumo[]
  removidos: ItemResumo[]
  inalterados: ItemResumo[]
  ignoradas: Array<{ titulo: string; tipo_secao: TipoSecaoImportacao | null }>
}

interface AnaliseDocx {
  nomeArquivo: string
  hashArquivo: string
  codigoSugerido: string | null
  secoes: Array<Omit<SecaoImportada, 'acao'>>
  tiposSecao: TipoSecao[]
  aviso: string | null
}

const route = useRoute()
const auth = useAuth()
const podeImportar = computed(() => auth.can('secoes:gerenciar'))
const passos = ['Enviar', 'Revisar', 'Confirmar']
const passo = ref(1)
const arquivo = ref<File | null>(null)
const analise = ref<AnaliseDocx | null>(null)
const secoes = ref<SecaoImportada[]>([])
const tiposSecao = ref<TipoSecao[]>([])
const codigoId = ref('')
const codigoBusca = ref('')
const codigos = ref<CodigoListItem[]>([])
const itensAtuais = ref<ItemExistente[]>([])
const buscaItens = ref<Record<string, string>>({})
const criarNovo = ref(false)
const novoCodigo = reactive({ codigo: '', marca: '', modelo: '', motor: '', ano: '', observacoes: '' })
const progresso = ref(0)
const carregandoCodigos = ref(false)
const carregandoItens = ref(false)
const analisando = ref(false)
const confirmando = ref(false)
const erro = ref('')
const aviso = ref('')
const sucesso = ref<{ id: string; codigoId: string; resumo: ResumoConfirmacao } | null>(null)
let temporizadorBusca: ReturnType<typeof setTimeout> | undefined

const opcoesSecao = computed(() => [
  { label: 'Não atribuir seção', value: '' },
  ...tiposSecao.value.map(secao => ({ label: secao.titulo, value: secao.tipo })),
])
const opcoesCodigo = computed(() => [
  { label: 'Selecione um código', value: '' },
  ...codigos.value.map(item => ({ label: `${item.codigo} · ${item.marca} ${item.modelo}`, value: item.id })),
])
const resumoPrevio = computed<ResumoConfirmacao>(() => {
  const resumo: ResumoConfirmacao = { novos: [], removidos: [], inalterados: [], ignoradas: [] }
  const entradas = new Map<string, number>()
  const tiposIncluidos = new Set<TipoSecaoImportacao>()

  for (const secao of secoes.value) {
    if (secao.acao !== 'importar' || !secao.tipoSecao) {
      resumo.ignoradas.push({ titulo: secao.tituloOriginal, tipo_secao: secao.tipoSecao })
      continue
    }
    tiposIncluidos.add(secao.tipoSecao)
    for (const item of secao.itens) {
      const chave = `${secao.tipoSecao}\u0000${item.nomeCompleto}`
      const ocorrencia = (entradas.get(chave) ?? 0) + 1
      entradas.set(chave, ocorrencia)
      const identidade = { tipo_secao: secao.tipoSecao, nome_completo: item.nomeCompleto, ocorrencia }
      const existentes = itensAtuais.value
        .filter(atual => atual.tipo_secao === secao.tipoSecao && atual.nome_completo === item.nomeCompleto)
        .sort((a, b) => a.ordem - b.ordem)
      if (existentes[ocorrencia - 1]) resumo.inalterados.push(identidade)
      else resumo.novos.push(identidade)
    }
  }

  const ocorrenciasAtuais = new Map<string, number>()
  for (const atual of [...itensAtuais.value].sort((a, b) => a.ordem - b.ordem)) {
    if (!tiposIncluidos.has(atual.tipo_secao)) continue
    const chave = `${atual.tipo_secao}\u0000${atual.nome_completo}`
    const ocorrencia = (ocorrenciasAtuais.get(chave) ?? 0) + 1
    ocorrenciasAtuais.set(chave, ocorrencia)
    if (ocorrencia > (entradas.get(chave) ?? 0)) {
      resumo.removidos.push({ tipo_secao: atual.tipo_secao, nome_completo: atual.nome_completo, ocorrencia })
    }
  }
  return resumo
})
const secoesVisiveis = computed(() => secoes.value.filter(secao => secao.status !== 'fora_escopo'))
const totalItensVisiveis = computed(() =>
  secoesVisiveis.value.reduce((total, secao) => total + secao.itens.length, 0),
)
const podeAvancarRevisao = computed(() =>
  !carregandoItens.value
  && (criarNovo.value
    ? codigoSchema.safeParse({ ...novoCodigo, ano: novoCodigo.ano ? Number(novoCodigo.ano) : null }).success
    : Boolean(codigoId.value))
  && secoes.value.some(secao => secao.acao === 'importar' && secao.tipoSecao !== null),
)

function mensagemErro(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = error.data
    if (typeof data === 'object' && data !== null && 'statusMessage' in data && typeof data.statusMessage === 'string') return data.statusMessage
  }
  return error instanceof Error ? error.message : fallback
}

function requestMultipart<T>(url: string, formData: FormData, onProgress: (percentual: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const requisicao = new XMLHttpRequest()
    requisicao.open('POST', url)
    requisicao.withCredentials = true
    requisicao.upload.onprogress = (evento) => {
      if (evento.lengthComputable) onProgress(Math.round((evento.loaded / evento.total) * 100))
    }
    requisicao.onerror = () => reject(new Error('Não foi possível enviar o documento. Verifique sua conexão e tente novamente.'))
    requisicao.onload = () => {
      let resposta: unknown
      try {
        resposta = JSON.parse(requisicao.responseText)
      } catch {
        reject(new Error('O servidor retornou uma resposta inválida.'))
        return
      }
      if (requisicao.status < 200 || requisicao.status >= 300) {
        const detalhe = typeof resposta === 'object' && resposta !== null && 'statusMessage' in resposta && typeof resposta.statusMessage === 'string'
          ? resposta.statusMessage
          : 'Não foi possível concluir a operação.'
        reject(new Error(detalhe))
        return
      }
      resolve(resposta as T)
    }
    requisicao.send(formData)
  })
}

async function carregarCodigos(busca = '') {
  carregandoCodigos.value = true
  try {
    const selecionado = codigos.value.find(item => item.id === codigoId.value)
    const resposta = await $fetch<{ codigos: CodigoListItem[] }>('/api/codigos', {
      query: { busca, pagina: 1, limite: 50, ordenar: 'codigo', direcao: 'asc' },
    })
    codigos.value = resposta.codigos
    if (selecionado && !codigos.value.some(item => item.id === selecionado.id)) codigos.value.unshift(selecionado)
  } catch (error: unknown) {
    erro.value = mensagemErro(error, 'Não foi possível carregar os códigos existentes.')
  } finally {
    carregandoCodigos.value = false
  }
}

async function carregarItensAtuais(id: string) {
  itensAtuais.value = []
  if (!id) return
  carregandoItens.value = true
  try {
    const resposta = await $fetch<{ itens: ItemExistente[] }>(`/api/codigos/${id}/itens`)
    itensAtuais.value = resposta.itens
  } catch (error: unknown) {
    erro.value = mensagemErro(error, 'Não foi possível comparar os itens já cadastrados.')
    throw error
  } finally {
    carregandoItens.value = false
  }
}

function atualizarBuscaCodigo(value: string) {
  codigoBusca.value = value
  if (temporizadorBusca) clearTimeout(temporizadorBusca)
  temporizadorBusca = setTimeout(() => void carregarCodigos(value), 250)
}

async function selecionarCodigo(value: string) {
  codigoId.value = value
  erro.value = ''
  await carregarItensAtuais(value)
}

function alternarNovoCodigo(event: Event) {
  criarNovo.value = (event.target as HTMLInputElement).checked
  codigoId.value = ''
  itensAtuais.value = []
  if (criarNovo.value && !novoCodigo.codigo && analise.value?.codigoSugerido) novoCodigo.codigo = analise.value.codigoSugerido
}

function atribuirSecao(secao: SecaoImportada, valor: string) {
  const validado = tipoSecaoImportacaoSchema.safeParse(valor)
  secao.tipoSecao = validado.success ? validado.data : null
  secao.acao = validado.success ? 'importar' : 'ignorar'
  if (secao.status !== 'fora_escopo') secao.status = validado.success ? 'reconhecida' : 'nao_identificada'
}

function alternarIgnorar(secao: SecaoImportada) {
  if (secao.status === 'fora_escopo') return
  secao.acao = secao.acao === 'importar' ? 'ignorar' : 'importar'
}

function itensFiltrados(secao: SecaoImportada) {
  const busca = (buscaItens.value[secao.id] ?? '').trim().toLocaleLowerCase('pt-BR')
  if (!busca) return secao.itens
  return secao.itens.filter(item => item.nomeCompleto.toLocaleLowerCase('pt-BR').includes(busca))
}

function atualizarNomeItem(item: ItemImportado) {
  item.nomeCompleto = item.nomeCompleto.trim()
  const separador = item.nomeCompleto.indexOf('/DieselDiag:')
  if (separador < 0) {
    item.nomeOriginal = item.nomeCompleto
    item.nomePt = null
    return
  }
  item.nomeOriginal = item.nomeCompleto.slice(0, separador).trim()
  item.nomePt = item.nomeCompleto.slice(separador + '/DieselDiag:'.length).trim() || null
}

function nomeSecao(tipo: TipoSecaoImportacao) {
  return tiposSecao.value.find(item => item.tipo === tipo)?.titulo ?? tipo
}

function nomeTipo(tipo: TipoSecaoImportacao) {
  return `${nomeSecao(tipo)} · `
}

function codigoSelecionadoLabel() {
  const item = codigos.value.find(codigo => codigo.id === codigoId.value)
  return item ? `${item.codigo} · ${item.marca} ${item.modelo}` : 'Código selecionado'
}

async function analisarArquivo() {
  erro.value = ''
  aviso.value = ''
  if (!arquivo.value) {
    erro.value = 'Selecione um documento .docx para continuar.'
    return
  }
  if (criarNovo.value) {
    const validacao = codigoSchema.safeParse({ ...novoCodigo, ano: novoCodigo.ano ? Number(novoCodigo.ano) : null })
    if (!validacao.success) {
      erro.value = validacao.error.issues[0]?.message ?? 'Confira os dados do novo código.'
      return
    }
  }

  analisando.value = true
  progresso.value = 0
  try {
    const formData = new FormData()
    formData.append('file', arquivo.value)
    const resultado = await requestMultipart<AnaliseDocx>('/api/importacoes/analisar', formData, value => { progresso.value = value })
    analise.value = resultado
    tiposSecao.value = resultado.tiposSecao
    aviso.value = resultado.aviso ?? ''

    if (!criarNovo.value && !codigoId.value && resultado.codigoSugerido) {
      await carregarCodigos(resultado.codigoSugerido)
      const achado = codigos.value.find(item => item.codigo.toLocaleUpperCase('pt-BR') === resultado.codigoSugerido?.toLocaleUpperCase('pt-BR'))
      if (achado) {
        codigoId.value = achado.id
        codigoBusca.value = `${achado.codigo} · ${achado.marca} ${achado.modelo}`
        await carregarItensAtuais(achado.id)
      }
    }

    secoes.value = resultado.secoes.map(secao => ({
      ...secao,
      acao: secao.status === 'fora_escopo' || !secao.tipoSecao ? 'ignorar' : 'importar',
    }))
    if (criarNovo.value) {
      const validacao = codigoSchema.safeParse({ ...novoCodigo, ano: novoCodigo.ano ? Number(novoCodigo.ano) : null })
      if (validacao.success) Object.assign(novoCodigo, {
        ...validacao.data,
        motor: validacao.data.motor ?? '',
        ano: validacao.data.ano?.toString() ?? '',
        observacoes: validacao.data.observacoes ?? '',
      })
    }
    if (!criarNovo.value && codigoId.value) await carregarItensAtuais(codigoId.value)
    passo.value = 2
  } catch (error: unknown) {
    erro.value = mensagemErro(error, 'Não foi possível analisar o documento Word.')
  } finally {
    analisando.value = false
  }
}

function confirmarRevisao() {
  erro.value = ''
  if (!podeAvancarRevisao.value) {
    erro.value = 'Escolha o código de destino e atribua ao menos uma seção incluída no escopo.'
    return
  }
  passo.value = 3
}

async function confirmarImportacao() {
  if (!arquivo.value || !analise.value) return
  erro.value = ''
  confirmando.value = true
  progresso.value = 0
  try {
    const payload = {
      hashArquivo: analise.value.hashArquivo,
      ...(criarNovo.value
        ? { novoCodigo: { ...novoCodigo, ano: novoCodigo.ano ? Number(novoCodigo.ano) : null } }
        : { codigoId: codigoId.value }),
      secoes: secoes.value.map(secao => ({
        tituloOriginal: secao.tituloOriginal,
        tipoSecao: secao.tipoSecao,
        acao: secao.acao,
        itens: secao.itens.map(item => ({ nomeCompleto: item.nomeCompleto, ordem: item.ordem })),
      })),
    }
    const validado = criarImportacaoSchema.safeParse(payload)
    if (!validado.success) throw new Error(validado.error.issues[0]?.message ?? 'Confira as seções e o código de destino.')
    const formData = new FormData()
    formData.append('file', arquivo.value)
    formData.append('payload', JSON.stringify(validado.data))
    sucesso.value = await requestMultipart('/api/importacoes/confirmar', formData, value => { progresso.value = value })
    passo.value = 4
  } catch (error: unknown) {
    erro.value = mensagemErro(error, 'Não foi possível salvar a importação.')
  } finally {
    confirmando.value = false
  }
}

onMounted(async () => {
  if (!podeImportar.value) {
    await navigateTo('/codigos')
    return
  }
  await carregarCodigos()
  const codigoQuery = typeof route.query.codigo === 'string' ? route.query.codigo : ''
  if (codigoQuery) {
    try {
      const resposta = await $fetch<{ codigo: CodigoListItem }>(`/api/codigos/${codigoQuery}`)
      if (!codigos.value.some(item => item.id === resposta.codigo.id)) codigos.value.unshift(resposta.codigo)
      codigoId.value = resposta.codigo.id
      codigoBusca.value = `${resposta.codigo.codigo} · ${resposta.codigo.marca} ${resposta.codigo.modelo}`
      await carregarItensAtuais(codigoId.value)
    } catch (error: unknown) {
      erro.value = mensagemErro(error, 'Não foi possível abrir o código selecionado.')
    }
  }
})

onBeforeUnmount(() => {
  if (temporizadorBusca) clearTimeout(temporizadorBusca)
})
</script>

<template>
  <AppShell title="Importar documento Word" description="Extraia e revise os nomes de itens técnicos por seção.">
    <template #actions>
      <NuxtLink to="/importacoes" class="interactive inline-flex min-h-9 items-center gap-2 rounded-control border border-border bg-surface px-3 text-xs font-semibold hover:bg-surface-raised">
        <ArrowLeft :size="14" aria-hidden="true" /> Histórico de importações
      </NuxtLink>
    </template>

    <div v-if="sucesso" class="mx-auto max-w-2xl py-8">
      <UiCard class="p-6 text-center sm:p-9">
        <span class="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success-surface text-success"><Check :size="26" aria-hidden="true" /></span>
        <h2 class="mt-5 text-xl font-bold">Importação concluída</h2>
        <p class="mt-2 text-sm text-foreground-muted">{{ sucesso.resumo.novos.length }} novos, {{ sucesso.resumo.removidos.length }} removidos e {{ sucesso.resumo.inalterados.length }} inalterados.</p>
        <div class="mt-6 flex flex-wrap justify-center gap-3">
          <NuxtLink :to="`/codigos/${sucesso.codigoId}`" class="interactive inline-flex min-h-10 items-center gap-2 rounded-control bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">Abrir código</NuxtLink>
          <NuxtLink to="/importacoes" class="interactive inline-flex min-h-10 items-center rounded-control border border-border bg-surface px-4 text-sm font-semibold hover:bg-surface-raised">Ver importações</NuxtLink>
        </div>
      </UiCard>
    </div>

    <div v-else class="mx-auto max-w-5xl">
      <UiCard class="mb-5 p-4 sm:px-6"><UiStepper :steps="passos" :current-step="passo" aria-label="Etapas da importação" /></UiCard>
      <AppAlert v-if="erro" tone="error" class="mb-4">{{ erro }}</AppAlert>
      <div v-if="aviso" class="mb-4 rounded-card border border-warning/20 bg-warning-surface px-4 py-3 text-sm text-warning">{{ aviso }}</div>

      <section v-if="passo === 1" class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.85fr)]">
        <UiCard class="p-5 sm:p-6">
          <h2 class="text-base font-bold">1. Envie o documento</h2>
          <p class="mt-1 mb-5 text-sm text-foreground-muted">Cada documento deve conter um veículo e os itens organizados em títulos nível 1 e nível 2.</p>
          <UiFileUpload v-model="arquivo" accept=".docx" :max-size-mb="10" />
          <div v-if="analisando || progresso > 0" class="mt-4" role="status" aria-live="polite">
            <div class="mb-1 flex justify-between text-xs text-foreground-muted"><span>{{ analisando ? 'Enviando e analisando documento' : 'Envio concluído' }}</span><span>{{ progresso }}%</span></div>
            <div class="h-2 overflow-hidden rounded-full bg-surface-muted"><div class="h-full rounded-full bg-primary transition-[width] duration-200" :style="{ width: `${progresso}%` }" /></div>
          </div>
          <p class="mt-3 flex items-start gap-2 text-xs leading-5 text-foreground-subtle"><ShieldAlert :size="14" class="mt-0.5 shrink-0" aria-hidden="true" /> O original será armazenado em espaço privado para auditoria. Limite: 10 MB.</p>
        </UiCard>

        <UiCard class="p-5 sm:p-6">
          <h2 class="text-base font-bold">2. Código de destino</h2>
          <p class="mt-1 mb-5 text-sm text-foreground-muted">Confirme o veículo que receberá os itens.</p>
          <label class="flex items-center gap-2 text-sm font-semibold">
            <input :checked="criarNovo" type="checkbox" class="h-4 w-4 accent-primary" @change="alternarNovoCodigo">
            Criar um novo código
          </label>
          <div v-if="!criarNovo" class="mt-4 space-y-3">
            <UiField id="buscar-codigo-importacao" label="Buscar código existente" :model-value="codigoBusca" placeholder="Código, marca ou modelo" @update:model-value="atualizarBuscaCodigo" />
            <UiSelect id="codigo-destino" label="Código de destino" :options="opcoesCodigo" :model-value="codigoId" :disabled="carregandoCodigos" @update:model-value="selecionarCodigo" />
            <p v-if="analise?.codigoSugerido" class="text-xs text-foreground-muted">Código sugerido: <span class="font-mono font-semibold text-foreground">{{ analise.codigoSugerido }}</span></p>
          </div>
          <div v-else class="mt-4 grid gap-3 sm:grid-cols-2">
            <UiField id="novo-codigo" label="Código" v-model="novoCodigo.codigo" placeholder="Ex.: CHP-0231" />
            <UiField id="nova-marca" label="Marca" v-model="novoCodigo.marca" placeholder="Ex.: Volkswagen" />
            <UiField id="novo-modelo" label="Modelo" v-model="novoCodigo.modelo" placeholder="Ex.: Gol" />
            <UiField id="novo-motor" label="Motor" v-model="novoCodigo.motor" placeholder="Ex.: 1.6" />
            <UiField id="novo-ano" label="Ano" v-model="novoCodigo.ano" type="number" min="1886" max="2200" />
            <UiField id="nova-observacao" label="Observações" v-model="novoCodigo.observacoes" class="sm:col-span-2" />
          </div>
          <div class="mt-6 flex justify-end">
            <UiButton variant="primary" :loading="analisando" :disabled="analisando" @click="analisarArquivo">
              <template #icon><Upload :size="15" aria-hidden="true" /></template>{{ analisando ? 'Analisando…' : 'Enviar e analisar' }}
            </UiButton>
          </div>
        </UiCard>
      </section>

      <section v-else-if="passo === 2" class="space-y-4">
        <UiCard class="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5">
          <div class="min-w-0"><h2 class="truncate text-sm font-bold">{{ analise?.nomeArquivo }}</h2><p class="mt-1 text-xs text-foreground-muted">{{ secoesVisiveis.length }} seções · {{ totalItensVisiveis }} itens encontrados</p></div>
          <UiButton variant="secondary" size="sm" @click="passo = 1"><template #icon><ArrowLeft :size="14" aria-hidden="true" /></template>Voltar</UiButton>
        </UiCard>

        <UiCard v-if="!codigoId || criarNovo" class="p-4 sm:p-5">
          <h2 class="text-sm font-bold">Código de destino</h2>
          <label class="mt-3 flex items-center gap-2 text-sm font-semibold">
            <input :checked="criarNovo" type="checkbox" class="h-4 w-4 accent-primary" @change="alternarNovoCodigo">
            Criar um novo código
          </label>
          <div v-if="criarNovo" class="mt-4 grid gap-3 sm:grid-cols-2">
            <UiField id="novo-codigo-revisao" label="Código" v-model="novoCodigo.codigo" />
            <UiField id="nova-marca-revisao" label="Marca" v-model="novoCodigo.marca" />
            <UiField id="novo-modelo-revisao" label="Modelo" v-model="novoCodigo.modelo" />
            <UiField id="novo-motor-revisao" label="Motor" v-model="novoCodigo.motor" />
            <UiField id="novo-ano-revisao" label="Ano" v-model="novoCodigo.ano" type="number" min="1886" max="2200" />
          </div>
          <div v-else class="mt-4 grid gap-3 sm:grid-cols-2 sm:items-end">
            <UiField id="buscar-codigo-revisao" label="Buscar código" :model-value="codigoBusca" placeholder="Código, marca ou modelo" @update:model-value="atualizarBuscaCodigo" />
            <UiSelect id="codigo-destino-revisao" label="Selecionar destino" :options="opcoesCodigo" :model-value="codigoId" @update:model-value="selecionarCodigo" />
          </div>
        </UiCard>

        <article v-for="secao in secoesVisiveis" :key="secao.id" class="surface-card overflow-hidden">
          <header class="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4 sm:px-5">
            <div class="min-w-0">
              <p class="text-[10px] font-bold uppercase tracking-wide text-foreground-subtle">Título nível 1</p>
              <h3 class="mt-1 break-words text-sm font-bold">{{ secao.tituloOriginal }}</h3>
            </div>
            <UiBadge :tone="secao.status === 'reconhecida' ? 'success' : secao.status === 'fora_escopo' ? 'neutral' : 'warning'" dot>
              {{ secao.status === 'reconhecida' ? 'Reconhecida' : secao.status === 'fora_escopo' ? 'Fora do escopo desta importação' : 'Não identificada' }}
            </UiBadge>
          </header>
          <div class="grid gap-4 p-4 sm:p-5 lg:grid-cols-[240px_minmax(0,1fr)]">
            <div class="space-y-3">
              <UiSelect
                :id="`secao-${secao.id}`"
                label="Seção atribuída"
                :options="opcoesSecao"
                :model-value="secao.tipoSecao ?? ''"
                :disabled="secao.status === 'fora_escopo'"
                @update:model-value="atribuirSecao(secao, $event)"
              />
              <button
                v-if="secao.status !== 'fora_escopo'"
                type="button"
                class="interactive min-h-9 rounded-control border border-border px-3 text-xs font-semibold hover:bg-surface-raised"
                @click="alternarIgnorar(secao)"
              >{{ secao.acao === 'ignorar' ? 'Incluir seção' : 'Ignorar seção' }}</button>
              <p v-else class="text-xs leading-5 text-foreground-muted">Títulos de falhas são automaticamente ignorados nesta importação.</p>
            </div>

            <div class="min-w-0">
              <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
                <p class="text-xs font-semibold">{{ secao.itens.length }} {{ secao.itens.length === 1 ? 'item nível 2' : 'itens nível 2' }}</p>
                <label class="relative block w-full sm:max-w-xs">
                  <Search :size="14" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle" aria-hidden="true" />
                  <input v-model="buscaItens[secao.id]" :aria-label="`Buscar itens em ${secao.tituloOriginal}`" class="interactive min-h-9 w-full rounded-control border border-border bg-surface pl-9 pr-3 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" placeholder="Buscar nomes de itens">
                </label>
              </div>
              <ul v-if="itensFiltrados(secao).length" class="max-h-72 divide-y divide-border overflow-auto rounded-control border border-border">
                <li v-for="item in itensFiltrados(secao)" :key="item.id" class="flex flex-wrap items-start justify-between gap-2 px-3 py-2.5 text-xs">
                  <input
                    v-model="item.nomeCompleto"
                    :aria-label="`Nome do item ${item.ordem} em ${secao.tituloOriginal}`"
                    class="interactive min-w-0 flex-1 rounded-control border border-transparent bg-transparent px-1 py-0.5 text-xs font-medium focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                    @change="atualizarNomeItem(item)"
                  >
                  <span v-if="item.nomePt" class="text-foreground-muted">{{ item.nomeOriginal }} <span aria-hidden="true">/</span> {{ item.nomePt }}</span>
                </li>
              </ul>
              <p v-else class="rounded-control border border-dashed border-border px-3 py-5 text-center text-xs text-foreground-muted">
                {{ secao.itens.length ? 'Nenhum item corresponde à busca.' : 'Nenhum Heading 2 nesta seção.' }}
              </p>
              <div v-if="secao.tipoSecao && secao.acao === 'importar'" class="mt-3 flex flex-wrap gap-2 text-[11px]">
                <UiBadge tone="success">{{ resumoPrevio.novos.filter(item => item.tipo_secao === secao.tipoSecao).length }} novos</UiBadge>
                <UiBadge tone="danger">{{ resumoPrevio.removidos.filter(item => item.tipo_secao === secao.tipoSecao).length }} removidos</UiBadge>
                <UiBadge tone="neutral">{{ resumoPrevio.inalterados.filter(item => item.tipo_secao === secao.tipoSecao).length }} inalterados</UiBadge>
              </div>
              <p v-if="secao.status === 'fora_escopo'" class="mt-2 text-xs text-foreground-muted">Os itens desta seção não serão gravados.</p>
            </div>
          </div>
        </article>

        <div class="flex flex-wrap justify-between gap-3">
          <UiButton variant="secondary" @click="passo = 1"><template #icon><ArrowLeft :size="14" aria-hidden="true" /></template>Voltar ao envio</UiButton>
          <UiButton variant="primary" :disabled="!podeAvancarRevisao" @click="confirmarRevisao"><template #icon><ArrowRight :size="14" aria-hidden="true" /></template>Revisão concluída</UiButton>
        </div>
      </section>

      <section v-else-if="passo === 3" class="mx-auto max-w-3xl">
        <UiCard class="p-5 sm:p-7">
          <div class="flex items-start gap-3">
            <span class="grid h-10 w-10 shrink-0 place-items-center rounded-control bg-info-surface text-info"><FileText :size="18" aria-hidden="true" /></span>
            <div><h2 class="text-base font-bold">Confirme a importação</h2><p class="mt-1 text-sm text-foreground-muted">Revise a comparação de nomes antes de gravar os itens e arquivar o original.</p></div>
          </div>
          <dl class="mt-6 grid gap-3 sm:grid-cols-4">
            <div class="rounded-card border border-success/20 bg-success-surface/40 p-4"><dt class="text-xs font-semibold text-success">Novos</dt><dd class="mt-2 text-2xl font-bold">{{ resumoPrevio.novos.length }}</dd></div>
            <div class="rounded-card border border-danger/20 bg-danger-surface/40 p-4"><dt class="text-xs font-semibold text-danger">Removidos</dt><dd class="mt-2 text-2xl font-bold">{{ resumoPrevio.removidos.length }}</dd></div>
            <div class="rounded-card border border-border bg-surface-raised p-4"><dt class="text-xs font-semibold text-foreground-muted">Inalterados</dt><dd class="mt-2 text-2xl font-bold">{{ resumoPrevio.inalterados.length }}</dd></div>
            <div class="rounded-card border border-border bg-surface-raised p-4"><dt class="text-xs font-semibold text-foreground-muted">Seções ignoradas</dt><dd class="mt-2 text-2xl font-bold">{{ resumoPrevio.ignoradas.length }}</dd></div>
          </dl>
          <div class="mt-5 rounded-control border border-border p-4">
            <p class="text-xs font-bold">{{ analise?.nomeArquivo }}</p>
            <p class="mt-1 text-xs text-foreground-muted">Destino: <span class="font-semibold text-foreground">{{ criarNovo ? `${novoCodigo.codigo} · ${novoCodigo.marca} ${novoCodigo.modelo}` : codigoSelecionadoLabel() }}</span></p>
            <ul class="mt-3 max-h-56 space-y-1 overflow-auto text-xs text-foreground-muted">
              <li v-for="item in resumoPrevio.novos" :key="`new-${item.tipo_secao}-${item.nome_completo}-${item.ocorrencia}`">Novo: {{ nomeTipo(item.tipo_secao) }}{{ item.nome_completo }}<span v-if="item.ocorrencia > 1"> (ocorrência {{ item.ocorrencia }})</span></li>
              <li v-for="item in resumoPrevio.removidos" :key="`removed-${item.tipo_secao}-${item.nome_completo}-${item.ocorrencia}`">Será desativado: {{ nomeTipo(item.tipo_secao) }}{{ item.nome_completo }}</li>
              <li v-for="item in resumoPrevio.inalterados" :key="`same-${item.tipo_secao}-${item.nome_completo}-${item.ocorrencia}`">Inalterado: {{ nomeTipo(item.tipo_secao) }}{{ item.nome_completo }}</li>
              <li v-for="(item, index) in resumoPrevio.ignoradas" :key="`ignored-${index}`">Ignorada: {{ item.titulo }}</li>
            </ul>
          </div>
          <div v-if="confirmando" class="mt-5" role="status" aria-live="polite">
            <div class="mb-1 flex justify-between text-xs text-foreground-muted"><span>Salvando a importação</span><span>{{ progresso }}%</span></div>
            <div class="h-2 overflow-hidden rounded-full bg-surface-muted"><div class="h-full rounded-full bg-primary transition-[width] duration-200" :style="{ width: `${progresso}%` }" /></div>
          </div>
          <div class="mt-6 flex flex-wrap justify-between gap-3">
            <UiButton variant="secondary" :disabled="confirmando" @click="passo = 2"><template #icon><ArrowLeft :size="14" aria-hidden="true" /></template>Voltar à revisão</UiButton>
            <UiButton variant="primary" :loading="confirmando" @click="confirmarImportacao"><template #icon><Check :size="14" aria-hidden="true" /></template>{{ confirmando ? 'Gravando…' : 'Confirmar importação' }}</UiButton>
          </div>
        </UiCard>
      </section>
    </div>
  </AppShell>
</template>
