import { Outlet } from 'react-router-dom'
import { TopBar } from './TopBar'
import { Sidebar } from './Sidebar'
import { useNocWebSockets } from '@/hooks/useWebSockets'

export function AppShell() {
  useNocWebSockets()

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
