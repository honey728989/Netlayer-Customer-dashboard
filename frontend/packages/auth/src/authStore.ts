import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { normalizeAuthUser, type AuthUser } from '@netlayer/api'

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void
  clearAuth: () => void
  updateUser: (user: Partial<AuthUser>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) => {
        const normalizedUser = normalizeAuthUser(user as unknown as Record<string, unknown>)
        localStorage.setItem('nl_access_token', accessToken)
        localStorage.setItem('nl_refresh_token', refreshToken)
        set({ user: normalizedUser, accessToken, refreshToken, isAuthenticated: true })
      },

      clearAuth: () => {
        localStorage.removeItem('nl_access_token')
        localStorage.removeItem('nl_refresh_token')
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false })
      },

      updateUser: (partial) =>
        set((state) => ({
          user: state.user
            ? normalizeAuthUser({ ...state.user, ...partial } as Record<string, unknown>)
            : null,
        })),
    }),
    {
      name: 'netlayer-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
