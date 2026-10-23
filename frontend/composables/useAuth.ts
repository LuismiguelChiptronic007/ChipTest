import type { Acao } from '~/types/auth'

export function useAuth() {
  const store = useAuthStore()

  return {
    usuario: computed(() => store.usuario),
    perfil: computed(() => store.perfil),
    papel: computed(() => store.perfil?.papel ?? null),
    isAdmin: computed(() => store.perfil?.ativo === true && store.perfil.papel === 'admin'),
    carregando: computed(() => store.carregando),
    can: (acao: Acao) => store.pode(acao),
    inicializar: store.inicializar,
  }
}
