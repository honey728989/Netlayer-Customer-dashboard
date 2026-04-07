import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { TopBar } from './TopBar'
import { Sidebar } from './Sidebar'
import { useNocWebSockets } from '@/hooks/useWebSockets'
import { useAuthStore } from '@netlayer/auth'

// ─── Route-level Error Boundary ───────────────────────────────────────────────

interface ErrorBoundaryState {
  hasError: boolean
  message: string
}

class RouteErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[RouteErrorBoundary]', error, info)
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="rounded-full bg-status-offline/10 p-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-status-offline/70"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-white">Page error</p>
            <p className="mt-0.5 text-xs text-muted">
              {this.state.message || 'An unexpected error occurred.'}
            </p>
          </div>
          <button onClick={this.handleReset} className="btn-ghost">
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── App Shell ────────────────────────────────────────────────────────────────

function AppShellInner() {
  const { user } = useAuthStore()
  useNocWebSockets(user?.role === 'admin')

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <RouteErrorBoundary>
            <Outlet />
          </RouteErrorBoundary>
        </main>
      </div>
    </div>
  )
}

export function AppShell() {
  return <AppShellInner />
}
