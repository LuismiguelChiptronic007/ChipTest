const rotasPublicas = new Set(['/login', '/cadastro', '/recuperar-senha', '/redefinir-senha', '/design-system'])

export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/design-system') return

  const auth = useAuthStore()
  await auth.recarregar()

  const publico = rotasPublicas.has(to.path)
  const aguardando = to.path === '/aguardando-liberacao'

  if (!auth.usuario && !publico) {
    return navigateTo('/login')
  }

  if (auth.usuario && !auth.perfil) {
    return navigateTo('/login')
  }

  if (auth.usuario && auth.perfil && !auth.perfil.ativo && !aguardando) {
    return navigateTo('/aguardando-liberacao')
  }

  if (auth.usuario && auth.perfil?.ativo && aguardando) {
    return navigateTo('/painel')
  }

  if (auth.usuario && (to.path === '/login' || to.path === '/cadastro')) {
    return navigateTo(auth.perfil?.ativo ? '/painel' : '/aguardando-liberacao')
  }
})
