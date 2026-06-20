import { useState } from 'react'
import { BellIcon, ChevronDownIcon, UserCircleIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

const roleLabels: Record<string, string> = {
  owner: 'Owner', ceo: 'CEO', manager: 'Manager',
  accountant: 'Accountant', sales: 'Sales', operations: 'Operations',
}

interface HeaderProps {
  title: string
}

export function Header({ title }: HeaderProps) {
  const { profile, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    toast.success('Signed out successfully')
  }

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-10">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>

      <div className="flex items-center gap-3">
        <button className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
          <BellIcon className="w-5 h-5" />
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-semibold">
                {profile?.full_name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-gray-900 leading-none">{profile?.full_name}</p>
              <p className="text-xs text-gray-500">{roleLabels[profile?.role ?? '']}</p>
            </div>
            <ChevronDownIcon className="w-4 h-4 text-gray-400" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 z-20 py-1">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
                  <p className="text-xs text-gray-500">{profile?.email}</p>
                </div>
                <button className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  <UserCircleIcon className="w-4 h-4" />
                  Profile
                </button>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <ArrowRightOnRectangleIcon className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
