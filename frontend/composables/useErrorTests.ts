import { z } from 'zod'
import { computed, onMounted, ref, toValue, type MaybeRefOrGetter } from 'vue'

const kindSchema = z.enum(['bancada', 'campo'])
const statusSchema = z.enum(['pendente', 'em_andamento', 'aprovado', 'reprovado'])
const responseSchema = z.object({
  testes: z.array(z.object({
    id: z.string().uuid(),
    ocorrencia_id: z.string().uuid(),
    source: z.enum(['ocorrencia', 'carga']),
    source_test_id: z.string().uuid().nullable(),
    kind: kindSchema,
    sequence: z.number().int().positive(),
    status: statusSchema,
    tested_at: z.string(),
    responsible_id: z.string().uuid().nullable(),
    responsible_name: z.string().nullable(),
    responsibles: z.array(z.object({ id: z.string().uuid(), nome: z.string() })),
    result: z.string().nullable(),
    notes: z.string().nullable(),
    segment: z.string().nullable(),
    model: z.string().nullable(),
    version: z.string().nullable(),
    load_status: z.enum(['aprovada', 'reprovada']).nullable(),
    structure_status: z.enum(['aprovada', 'reprovada']).nullable(),
    needs_bench: z.number().int().min(0).max(1).nullable(),
    needs_field: z.number().int().min(0).max(1).nullable(),
    bench_solves: z.number().int().min(0).max(1).nullable(),
    created_by: z.string().uuid(),
    created_at: z.string(),
    updated_at: z.string(),
    attachments: z.array(z.object({
      id: z.string().uuid(),
      test_id: z.string().uuid(),
      file_name: z.string(),
      tipo_mime: z.string(),
      tamanho_bytes: z.number().int().positive(),
      created_at: z.string(),
    })),
  })),
})

export type ErrorTestKind = z.infer<typeof kindSchema>
export type ErrorTestStatus = z.infer<typeof statusSchema>

export interface ErrorTest {
  id: string
  ocorrencia_id: string
  source: 'ocorrencia' | 'carga'
  source_test_id: string | null
  kind: ErrorTestKind
  sequence: number
  status: ErrorTestStatus
  tested_at: string
  responsible_id: string | null
  responsible_name: string | null
  responsibles: Array<{ id: string; nome: string }>
  result: string | null
  notes: string | null
  segment: string | null
  model: string | null
  version: string | null
  load_status: 'aprovada' | 'reprovada' | null
  structure_status: 'aprovada' | 'reprovada' | null
  needs_bench: number | null
  needs_field: number | null
  bench_solves: number | null
  created_by: string
  created_at: string
  updated_at: string
  attachments: Array<{
    id: string
    test_id: string
    file_name: string
    tipo_mime: string
    tamanho_bytes: number
    created_at: string
  }>
}

export interface ErrorTestInput {
  kind: ErrorTestKind
  status: ErrorTestStatus
  testedAt: string
  responsibleIds: string[]
  result: string | null
  notes: string | null
  segment: string | null
  model: string | null
  version: string | null
  loadStatus: 'aprovada' | 'reprovada' | null
  structureStatus: 'aprovada' | 'reprovada' | null
  needsBench: boolean | null
  needsField: boolean | null
  benchSolves: boolean | null
}

const maxAttachmentBytes = 10 * 1024 * 1024
const chunkBytes = 1024 * 1024
const mimeByExtension: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  pdf: 'application/pdf',
  mp4: 'video/mp4',
  txt: 'text/plain',
  log: 'text/plain',
}

function base64(bytes: Uint8Array): string {
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + 0x8000, bytes.length)))
  }
  return btoa(binary)
}

export function useErrorTests(ocorrenciaId: MaybeRefOrGetter<string>) {
  const route = useRoute()
  const router = useRouter()
  const testes = ref<ErrorTest[]>([])
  const carregando = ref(true)
  const erro = ref('')
  const idsAbertos = ref<string[]>([])
  const carregouInicialmente = ref(false)
  const abaAtiva = computed<ErrorTestKind>(() => route.query.tab === 'campo' ? 'campo' : 'bancada')
  const testesAtivos = computed(() => testes.value.filter(teste => teste.kind === abaAtiva.value))
  const contagens = computed(() => ({
    bancada: testes.value.filter(teste => teste.kind === 'bancada').length,
    campo: testes.value.filter(teste => teste.kind === 'campo').length,
  }))

  async function selecionarAba(kind: ErrorTestKind) {
    await router.replace({ query: { ...route.query, tab: kind } })
  }

  async function carregar() {
    carregando.value = true
    erro.value = ''
    try {
      const resultado = responseSchema.safeParse(await $fetch<unknown>(
        `/api/ocorrencias/${toValue(ocorrenciaId)}/testes`,
      ))
      if (!resultado.success) throw new Error('A lista de testes retornou dados inválidos.')
      testes.value = resultado.data.testes
      if (route.query.tab !== 'bancada' && route.query.tab !== 'campo') {
        const tipoVinculado = testes.value.find(teste => teste.source === 'carga')?.kind
        await router.replace({ query: { ...route.query, tab: tipoVinculado ?? 'bancada' } })
      }
      if (!carregouInicialmente.value) {
        const maisRecentes = (['bancada', 'campo'] as const)
          .map(kind => testes.value.find(teste => teste.kind === kind)?.id)
          .filter((id): id is string => Boolean(id))
        idsAbertos.value = maisRecentes
        carregouInicialmente.value = true
      } else {
        idsAbertos.value = idsAbertos.value.filter(id => testes.value.some(teste => teste.id === id))
      }
      const testeDaUrl = String(route.query.test ?? '')
      if (testeDaUrl && testes.value.some(teste => teste.id === testeDaUrl || teste.source_test_id === testeDaUrl)) {
        const teste = testes.value.find(item => item.id === testeDaUrl || item.source_test_id === testeDaUrl)
        if (teste && !idsAbertos.value.includes(teste.id)) idsAbertos.value.push(teste.id)
      }
    } catch (cause: unknown) {
      erro.value = mensagemDeErro(cause, 'Não foi possível carregar os testes desta ocorrência.')
    } finally {
      carregando.value = false
    }
  }

  function alternarTeste(id: string) {
    idsAbertos.value = idsAbertos.value.includes(id)
      ? idsAbertos.value.filter(aberto => aberto !== id)
      : [...idsAbertos.value, id]
  }

  function expandirAtivos() {
    idsAbertos.value = [
      ...idsAbertos.value.filter(id => !testesAtivos.value.some(teste => teste.id === id)),
      ...testesAtivos.value.map(teste => teste.id),
    ]
  }

  function recolherAtivos() {
    const idsAtivos = new Set(testesAtivos.value.map(teste => teste.id))
    idsAbertos.value = idsAbertos.value.filter(id => !idsAtivos.has(id))
  }

  async function criar(input: ErrorTestInput) {
    const resposta = await $fetch<{ id: string }>(`/api/ocorrencias/${toValue(ocorrenciaId)}/testes`, {
      method: 'POST',
      body: input,
    })
    idsAbertos.value.push(resposta.id)
    await carregar()
    idsAbertos.value = [...new Set([...idsAbertos.value, resposta.id])]
  }

  async function editar(testeId: string, input: ErrorTestInput) {
    await $fetch(`/api/ocorrencias/${toValue(ocorrenciaId)}/testes/${testeId}`, {
      method: 'PATCH',
      body: input,
    })
    await carregar()
  }

  async function alterarStatus(testeId: string, status: ErrorTestStatus) {
    await $fetch(`/api/ocorrencias/${toValue(ocorrenciaId)}/testes/${testeId}/status`, {
      method: 'PATCH',
      body: { status },
    })
    await carregar()
  }

  async function excluir(testeId: string) {
    await $fetch(`/api/ocorrencias/${toValue(ocorrenciaId)}/testes/${testeId}`, { method: 'DELETE' })
    await carregar()
  }

  async function enviarAnexo(testeId: string, file: File) {
    if (file.size < 1 || file.size > maxAttachmentBytes) {
      throw new Error('O arquivo deve ter até 10 MB.')
    }
    const extension = file.name.split('.').at(-1)?.toLocaleLowerCase('pt-BR') ?? ''
    const tipoMime = mimeByExtension[extension]
    if (!tipoMime || (file.type && file.type !== 'application/octet-stream' && file.type !== tipoMime)) {
      throw new Error('Tipo de arquivo não permitido. Use PNG, JPG, WEBP, PDF, MP4, TXT ou LOG.')
    }
    const totalPartes = Math.ceil(file.size / chunkBytes)
    const url = `/api/ocorrencias/${toValue(ocorrenciaId)}/testes/${testeId}/anexos`
    const anexo = await $fetch<{ id: string }>(url, {
      method: 'POST',
      body: { fileName: file.name, tipoMime, tamanhoBytes: file.size, totalPartes },
    })

    try {
      for (let numeroParte = 0; numeroParte < totalPartes; numeroParte += 1) {
        const bytes = new Uint8Array(await file.slice(
          numeroParte * chunkBytes,
          Math.min((numeroParte + 1) * chunkBytes, file.size),
        ).arrayBuffer())
        await $fetch(`${url}/${anexo.id}/partes/${numeroParte}`, {
          method: 'PUT',
          body: { conteudoBase64: base64(bytes) },
        })
      }
    } catch (cause: unknown) {
      try {
        await $fetch(`${url}/${anexo.id}`, { method: 'DELETE' })
      } catch (cleanupError: unknown) {
        throw new Error(`${mensagemDeErro(cause, 'Não foi possível enviar o arquivo.')} A limpeza do envio incompleto também falhou: ${mensagemDeErro(cleanupError, 'erro desconhecido')}`)
      }
      throw cause
    }
    await carregar()
  }

  async function excluirAnexo(testeId: string, anexoId: string) {
    await $fetch(`/api/ocorrencias/${toValue(ocorrenciaId)}/testes/${testeId}/anexos/${anexoId}`, {
      method: 'DELETE',
    })
    await carregar()
  }

  onMounted(() => void carregar())

  return {
    abaAtiva,
    alterarStatus,
    carregar,
    carregando,
    contagens,
    criar,
    editar,
    erro,
    excluir,
    excluirAnexo,
    expandirAtivos,
    idsAbertos,
    selecionarAba,
    testesAtivos,
    testes,
    alternarTeste,
    recolherAtivos,
    enviarAnexo,
  }
}
