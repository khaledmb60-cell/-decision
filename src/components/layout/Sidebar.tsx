import { NavLink } from 'react-router-dom'
import {
  HomeIcon, UsersIcon, ShoppingCartIcon, CreditCardIcon,
  ArchiveBoxIcon, ChartBarIcon, ShieldCheckIcon, Cog6ToothIcon,
  ChevronDoubleLeftIcon, ChevronDoubleRightIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/hooks/usePermissions'
import { Resource } from '@/types'
import { clsx } from '@/components/ui/clsx'

const businessTypeLabels: Record<string, string> = {
  nursery: 'Nursery', construction: 'Construction', car_wash: 'Car Wash',
  laundry: 'Laundry', logistics: 'Logistics',
}

const navItems: { to: string; label: string; icon: React.ElementType; resource: Resource }[] = [
  { to: '/dashboard',  label: 'Dashboard',   icon: HomeIcon,          resource: 'dashboard'  },
  { to: '/customers',  label: 'Customers',   icon: UsersIcon,         resource: 'customers'  },
  { to: '/sales',      label: 'Sales',       icon: ShoppingCartIcon,  resource: 'sales'      },
  { to: '/expenses',   label: 'Expenses',    icon: CreditCardIcon,    resource: 'expenses'   },
  { to: '/inventory',  label: 'Inventory',   icon: ArchiveBoxIcon,    resource: 'inventory'  },
  { to: '/reports',    label: 'Reports',     icon: ChartBarIcon,      resource: 'reports'    },
  { to: '/users',      label: 'Users',       icon: ShieldCheckIcon,   resource: 'users'      },
  { to: '/settings',   label: 'Settings',    icon: Cog6ToothIcon,     resource: 'settings'   },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { tenant } = useAuth()
  const { can } = usePermissions()

  return (
    <aside className={clsx(
      'flex flex-col bg-gray-900 text-white transition-all duration-300 ease-in-out h-screen sticky top-0',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-gray-700">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">G</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-bold text-sm truncate">GrowCore</p>
              <p className="text-xs text-gray-400 truncate">
                {tenant ? businessTypeLabels[tenant.business_type] : 'ERP'}
              </p>
            </div>
          )}
        </div>
        <button
          onClick={onToggle}
          className="ml-auto p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors flex-shrink-0"
        >
          {collapsed
            ? <ChevronDoubleRightIcon className="w-4 h-4" />
            : <ChevronDoubleLeftIcon className="w-4 h-4" />
          }
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <div className="space-y-1 px-2">
          {navItems.map(item => {
            if (!can(item.resource, 'view')) return null
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) => clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            )
          })}
        </div>
      </nav>

      {/* Tenant info */}
      {!collapsed && tenant && (
        <div className="p-4 border-t border-gray-700">
          <p className="text-xs text-gray-400 truncate">{tenant.name}</p>
          <p className="text-xs text-gray-500">{tenant.currency}</p>
        </div>
      )}
    </aside>
  )
}
