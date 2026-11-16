type Theme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'chiptest-theme'

export function useTheme() {
  const theme = useState<Theme>('chiptest-theme', () => 'dark')
  const isDark = computed(() => theme.value === 'dark')
  let systemListenerRegistered = false

  function applyTheme(nextTheme: Theme | null) {
    if (!import.meta.client) return

    if (nextTheme) {
      document.documentElement.dataset.theme = nextTheme
      theme.value = nextTheme
      return
    }

    delete document.documentElement.dataset.theme
    theme.value = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  function initializeTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
    if (savedTheme === 'light' || savedTheme === 'dark') {
      applyTheme(savedTheme)
    } else {
      applyTheme(null)
    }

    if (!systemListenerRegistered) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (!localStorage.getItem(THEME_STORAGE_KEY)) applyTheme(null)
      })
      systemListenerRegistered = true
    }
  }

  function toggleTheme() {
    const nextTheme = isDark.value ? 'light' : 'dark'
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    applyTheme(nextTheme)
  }

  function followSystemTheme() {
    localStorage.removeItem(THEME_STORAGE_KEY)
    applyTheme(null)
  }

  return { theme, isDark, initializeTheme, toggleTheme, followSystemTheme }
}
