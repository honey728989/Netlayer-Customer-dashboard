import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuthStore } from '@netlayer/auth'
import { authApi, type AuthUser } from '@netlayer/api'

const ROLE_REDIRECT: Record<string, string> = {
  admin: '/noc',
  customer: '/portal',
  partner: '/partner',
}

function normalizeUserRole(user: AuthUser) {
  if (user.roles.includes('SUPER_ADMIN') || user.roles.includes('NOC_ENGINEER')) {
    return 'admin' as const
  }
  if (user.roles.includes('ENTERPRISE_ADMIN') || user.roles.includes('ENTERPRISE_USER')) {
    return 'customer' as const
  }
  if (user.roles.includes('PARTNER_ADMIN') || user.roles.includes('PARTNER_USER')) {
    return 'partner' as const
  }
  return 'admin' as const
}

export function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await authApi.login(email, password)
      const normalizedUser = {
        ...res.user,
        role: normalizeUserRole(res.user),
      }
      setAuth(normalizedUser, res.accessToken, res.refreshToken)
      navigate(ROLE_REDIRECT[normalizedUser.role] ?? '/', { replace: true })
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Invalid credentials. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base p-4">
      {/* Background grid */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,212,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand font-mono text-lg font-bold text-black">
            NL
          </div>
          <h1 className="font-display text-xl font-bold text-white">Netlayer</h1>
          <p className="mt-1 text-xs text-muted">Enterprise ISP Platform</p>
        </div>

        {/* Card */}
        <div className="card p-6">
          <h2 className="mb-5 text-sm font-semibold text-white">Sign in to your account</h2>

          {error && (
            <div className="mb-4 rounded-md border border-status-offline/30 bg-status-offline/10 px-3 py-2 text-xs text-status-offline">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted">
                Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-9"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2 text-sm disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="mt-4 text-center text-[10px] text-muted">
            Access is role-based. Contact your administrator for credentials.
          </p>
        </div>
      </div>
    </div>
  )
}
