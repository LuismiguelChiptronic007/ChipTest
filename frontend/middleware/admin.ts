export default defineNuxtRouteMiddleware(async () => {
  const auth = useAuthStore()
  await auth.recarregar()

  if (!auth.perfil?.ativo) return navigateTo('/aguardando-liberacao')
  if (auth.perfil.papel !== 'admin') return navigateTo('/painel')
})
