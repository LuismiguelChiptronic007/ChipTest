import { defineStore } from 'pinia'
import { z } from 'zod'
import type { Acao, Papel, Perfil, UsuarioSessao } from '~/types/auth'

const respostaAuthSchema = z.object({
  usuario: z.object({ id: z.string().uuid(), email: z.string().email() }),
  perfil: z.object({
    id: z.string().uuid(),
    nome: z.string(),
    setor_id: z.string().uuid(),
    setor: z.string(),
    papel: z.enum(['admin', 'engenharia', 'bancada', 'campo']),
    ativo: z.boolean(),
  }),
})

const permissoes: Record<Papel, Acao[]> = {
  admin: [
    'usuarios:ler',
    'usuarios:gerenciar',
    'codigos:ler',
    'codigos:gerenciar',
    'codigos:excluir',
    'secoes:gerenciar',
    'testes:ler',
    'testes:bancada',
    'testes:campo',
    'ocorrencias:relatar',
    'ocorrencias:gerenciar',
  ],
  engenharia: ['codigos:ler', 'codigos:gerenciar', 'codigos:excluir', 'secoes:gerenciar', 'testes:ler', 'ocorrencias:relatar', 'ocorrencias:gerenciar'],
  bancada: ['codigos:ler', 'testes:ler', 'testes:bancada', 'ocorrencias:relatar'],
  campo: ['codigos:ler', 'testes:ler', 'testes:campo', 'ocorrencias:relatar'],
}

export const useAuthStore = defineStore('auth', () => {
  const requestFetch = useRequestFetch()
  const usuario = ref<UsuarioSessao | null>(null)
  const perfil = ref<Perfil | null>(null)
  const carregando = ref(false)
  const inicializado = ref(false)

  async function inicializar(): Promise<void> {
    if (inicializado.value) return
    await recarregar()
  }

  async function recarregar(): Promise<void> {
    carregando.value = true
    try {
      const resposta = await requestFetch<unknown>('/api/auth/me')
      const validacao = respostaAuthSchema.safeParse(resposta)
      if (!validacao.success) {
        throw new Error('O perfil retornado pelo servidor está inválido.')
      }
      usuario.value = validacao.data.usuario
      perfil.value = validacao.data.perfil
      inicializado.value = true
    } catch (error: unknown) {
      if (
        typeof error === 'object'
        && error !== null
        && 'statusCode' in error
        && error.statusCode === 401
      ) {
        limpar()
      } else {
        throw error
      }
    } finally {
      carregando.value = false
    }
  }

  function limpar(): void {
    usuario.value = null
    perfil.value = null
    inicializado.value = true
  }

  function pode(acao: Acao): boolean {
    if (!perfil.value?.ativo) return false
    return permissoes[perfil.value.papel as Papel].includes(acao)
  }

  return { usuario, perfil, carregando, inicializado, inicializar, recarregar, limpar, pode }
})
