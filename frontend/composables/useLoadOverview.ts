import { computed, onMounted, ref, toValue, type MaybeRefOrGetter } from 'vue'
import { z } from 'zod'

<<<<<<< HEAD
const categorySchema = z.enum(['basico', 'sensores', 'atuadores', 'estados', 'ajustes', 'parametrizacoes'])
const functionImportCategorySchema = z.enum([
  'basico',
  'sensores',
  'estados',
  'atuadores',
  'ajustes',
  'parametrizacoes',
  'funcao_avancada',
])
=======
const categorySchema = z.enum(['basico', 'sensores', 'estados', 'parametrizacoes'])
>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3
const functionSchema = z.object({
  id: z.string().uuid(),
  overview_id: z.string().uuid(),
  category: categorySchema,
  sequence: z.number().int().positive(),
  title: z.string(),
  print_url: z.string().nullable(),
  created_at: z.string(),
  rows: z.array(z.object({
    id: z.string().uuid(),
    function_id: z.string().uuid(),
    position: z.number().int().positive(),
    item: z.string(),
    description: z.string(),
    value: z.string(),
  })),
})
<<<<<<< HEAD
const functionImportRowSchema = z.object({
  id: z.string().uuid(),
  overview_id: z.string().uuid(),
  category: functionImportCategorySchema,
  position: z.number().int().positive(),
  version_ontime: z.string(),
  function_type: z.string(),
  function_dieseldiag: z.string(),
  equipment_base: z.string(),
  developed: z.string(),
})
=======
>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3
const responseSchema = z.object({
  codigo: z.object({
    id: z.string().uuid(),
    codigo: z.string(),
    marca: z.string(),
    modelo: z.string(),
    motor: z.string().nullable(),
  }),
  overview: z.object({
    id: z.string().uuid(),
    codigo_id: z.string().uuid(),
    request_number: z.number().int().positive(),
    launched_on: z.string().nullable(),
    responsible_id: z.string().uuid().nullable(),
    responsible_name: z.string().nullable(),
    demand_type: z.enum(['novo_sistema', 'nova_funcao']),
    demand_status: z.enum(['campo_com_programador', 'campo_sem_programador']),
    sga_print_url: z.string().nullable(),
    system_info_url: z.string().nullable(),
    notes: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
  }),
  docs: z.array(z.object({
    key: z.enum(['simulacao', 'interpretacao', 'codigo_falhas', 'rg_dsd_12']),
    checked: z.union([z.boolean(), z.number().int()]),
  })),
  functions: z.array(functionSchema),
<<<<<<< HEAD
  functionImportRows: z.array(functionImportRowSchema),
  functionCounts: z.record(z.string(), z.number().int().nonnegative()),
  ocorrencias: z.array(z.object({
    id: z.string().uuid(),
    titulo: z.string(),
    status: z.enum(['aberta', 'em_analise', 'resolvida']),
  })),
=======
  functionCounts: z.record(z.string(), z.number().int().nonnegative()),
>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3
  tests: z.array(z.object({
    id: z.string().uuid(),
    ocorrencia_id: z.string().uuid(),
    kind: z.enum(['bancada', 'campo']),
    sequence: z.number().int().positive(),
    tested_at: z.string(),
    status: z.string(),
    segment: z.string().nullable(),
    model: z.string().nullable(),
    version: z.string().nullable(),
    load_status: z.enum(['aprovada', 'reprovada']).nullable(),
    structure_status: z.enum(['aprovada', 'reprovada']).nullable(),
    needs_bench: z.union([z.number().int().min(0).max(1), z.boolean()]).nullable(),
    needs_field: z.union([z.number().int().min(0).max(1), z.boolean()]).nullable(),
    bench_solves: z.union([z.number().int().min(0).max(1), z.boolean()]).nullable(),
<<<<<<< HEAD
=======
    error_title: z.string(),
>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3
    responsibles: z.array(z.object({ id: z.string().uuid(), nome: z.string() })),
  })),
  responsaveisDisponiveis: z.array(z.object({ id: z.string().uuid(), nome: z.string() })),
})

export type LoadOverviewData = z.infer<typeof responseSchema>
export type LoadOverviewInput = {
  requestNumber: number
  launchedOn: string | null
  responsibleId: string | null
  demandType: 'novo_sistema' | 'nova_funcao'
  demandStatus: 'campo_com_programador' | 'campo_sem_programador'
  sgaPrintUrl: string | null
  systemInfoUrl: string | null
  notes: string | null
<<<<<<< HEAD
  sgaPrintImage?: File | null
  systemInfoImage?: File | null
}
export type LoadFunctionCategory = z.infer<typeof categorySchema>
export type LoadFunctionImportCategory = z.infer<typeof functionImportCategorySchema>
=======
}
export type LoadFunctionCategory = z.infer<typeof categorySchema>
>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3
export type LoadFunctionRows = Array<{ item: string; description: string; value: string }>

export function useLoadOverview(codigoId: MaybeRefOrGetter<string>) {
  const data = ref<LoadOverviewData | null>(null)
  const loading = ref(true)
  const error = ref('')
  const base = computed(() => `/api/codigos/${toValue(codigoId)}/visao-geral`)

  async function load() {
<<<<<<< HEAD
    if (!data.value) loading.value = true
=======
    loading.value = true
>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3
    error.value = ''
    try {
      const parsed = responseSchema.safeParse(await $fetch<unknown>(base.value))
      if (!parsed.success) throw new Error('A visão geral retornou dados inválidos.')
      data.value = parsed.data
    } catch (cause: unknown) {
      error.value = mensagemDeErro(cause, 'Não foi possível carregar a visão geral da carga.')
    } finally {
      loading.value = false
    }
  }

  async function saveOverview(input: LoadOverviewInput) {
<<<<<<< HEAD
    const { sgaPrintImage, systemInfoImage, ...fields } = input
    if (sgaPrintImage || systemInfoImage) {
      const body = new FormData()
      body.set('input', JSON.stringify(fields))
      if (sgaPrintImage) body.set('sgaPrintImage', sgaPrintImage, sgaPrintImage.name)
      if (systemInfoImage) body.set('systemInfoImage', systemInfoImage, systemInfoImage.name)
      await $fetch(base.value, { method: 'PATCH', body })
    } else {
      await $fetch(base.value, { method: 'PATCH', body: fields })
    }
=======
    await $fetch(base.value, { method: 'PATCH', body: input })
>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3
    await load()
  }

  async function setDoc(key: string, checked: boolean) {
    await $fetch(`${base.value}/docs/${key}`, { method: 'PATCH', body: { checked } })
    const doc = data.value?.docs.find(item => item.key === key)
    if (doc) doc.checked = checked
  }

  async function addFunction(category: LoadFunctionCategory) {
    const result = await $fetch<{ id: string }>(`${base.value}/funcoes`, {
      method: 'POST',
      body: { category },
    })
    await load()
    return result.id
  }

  async function updateFunction(id: string, input: { title?: string; printUrl?: string | null }) {
    await $fetch(`${base.value}/funcoes/${id}`, { method: 'PATCH', body: input })
    await load()
  }

  async function removeFunction(id: string) {
    await $fetch(`${base.value}/funcoes/${id}`, { method: 'DELETE' })
    await load()
  }

  async function saveRows(id: string, rows: LoadFunctionRows) {
    await $fetch(`${base.value}/funcoes/${id}/linhas`, { method: 'PUT', body: { rows } })
    await load()
  }

  async function removeOverview() {
    await $fetch(base.value, { method: 'DELETE' })
  }

  onMounted(() => void load())

  return {
    data,
    loading,
    error,
    load,
    saveOverview,
    setDoc,
    addFunction,
    updateFunction,
    removeFunction,
    saveRows,
    removeOverview,
  }
}
