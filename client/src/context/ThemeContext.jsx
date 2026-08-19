import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { authApi } from '@/lib/api'
import { apiMessage } from '@/lib/utils'

const ThemeContext = createContext(null)

export const applyTheme = (theme) => {
  const next = theme === 'dark' ? 'dark' : 'light'
  document.documentElement.classList.toggle('dark', next === 'dark')
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', next === 'dark' ? '#010102' : '#ffffff')
}

export function ThemeProvider({ children }) {
  const { user, setUser } = useAuth()
  const theme = user?.theme === 'dark' ? 'dark' : 'light'
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setTheme = useCallback(
    async (next) => {
      const resolved = next === 'dark' ? 'dark' : 'light'
      if (!user || resolved === theme || saving) return
      applyTheme(resolved)
      setSaving(true)
      try {
        const updated = await authApi.setTheme(resolved)
        setUser(updated)
      } catch (error) {
        applyTheme(theme)
        toast.error(apiMessage(error, 'Could not update theme'))
      } finally {
        setSaving(false)
      }
    },
    [user, theme, saving, setUser]
  )

  const toggleTheme = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [setTheme, theme])

  const value = useMemo(() => ({ theme, setTheme, toggleTheme, saving }), [theme, setTheme, toggleTheme, saving])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
