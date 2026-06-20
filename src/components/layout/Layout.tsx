import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/customers': 'Customers',
  '/sales':     'Sales',
  '/expenses':  'Expenses',
  '/inventory': 'Inventory',
  '/reports':   'Reports',
  '/users':     'Users & Permissions',
  '/settings':  'Settings',
}

export function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const title = pageTitles[location.pathname] ?? 'GrowCore'

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
