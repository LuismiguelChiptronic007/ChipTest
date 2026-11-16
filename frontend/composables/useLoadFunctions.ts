import { computed, toValue, watch, type MaybeRefOrGetter } from 'vue'
import type { LoadFunctionCategory, LoadOverviewData } from './useLoadOverview'
import { useLoadOverview } from './useLoadOverview'

export type LoadFunction = LoadOverviewData['functions'][number]

const categoryNames: Record<LoadFunctionCategory, string> = {
  basico: 'Básico',
  sensores: 'Sensores',
<<<<<<< HEAD
  atuadores: 'Atuadores',
  estados: 'Estados',
  ajustes: 'Ajustes',
=======
  estados: 'Estados',
>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3
  parametrizacoes: 'Parametrizações',
}

export const loadFunctionCategories = Object.keys(categoryNames) as LoadFunctionCategory[]

export function functionSlug(category: LoadFunctionCategory, sequence: number) {
  return `${category}-${String(sequence).padStart(2, '0')}`
}

export function categoryTitle(func: Pick<LoadFunction, 'category' | 'sequence'>) {
  return `${categoryNames[func.category]} ${String(func.sequence).padStart(2, '0')}`
}

export function firstFunctionInCategory<T extends Pick<LoadFunction, 'category' | 'sequence'>>(
  functions: T[],
  category: LoadFunctionCategory,
): T | undefined {
  return functions
    .filter(func => func.category === category)
    .sort((a, b) => a.sequence - b.sequence)[0]
}

export function useLoadFunctions(codigoId: MaybeRefOrGetter<string>) {
  const route = useRoute()
  const router = useRouter()
  const overview = useLoadOverview(codigoId)

  const activeFunction = computed<LoadFunction | null>(() => {
    const selected = String(route.query.funcao ?? '')
    const functions = overview.data.value?.functions ?? []
    return functions.find(func => functionSlug(func.category, func.sequence) === selected)
      ?? functions[0]
      ?? null
  })

  const selectedSlug = computed(() => (
    activeFunction.value
      ? functionSlug(activeFunction.value.category, activeFunction.value.sequence)
      : ''
  ))

  watch(
    () => overview.data.value,
    async (data) => {
      if (!data?.functions.length) return
      const querySlug = String(route.query.funcao ?? '')
      if (!data.functions.some(func => functionSlug(func.category, func.sequence) === querySlug)) {
        const first = data.functions[0]!
        await router.replace({
          query: { ...route.query, funcao: functionSlug(first.category, first.sequence) },
        })
      }
    },
    { immediate: true },
  )

  async function selectFunction(slug: string) {
    await router.replace({ query: { ...route.query, funcao: slug } })
  }

  async function selectCategory(category: LoadFunctionCategory) {
    const func = firstFunctionInCategory(overview.data.value?.functions ?? [], category)
    if (func) await selectFunction(functionSlug(func.category, func.sequence))
  }

  return {
    ...overview,
    categoryNames,
    activeFunction,
    selectedSlug,
    selectFunction,
    selectCategory,
    updateFunction: overview.updateFunction,
    removeFunction: overview.removeFunction,
    saveRows: overview.saveRows,
    addFunction: overview.addFunction,
  }
}
