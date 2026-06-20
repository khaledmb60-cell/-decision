import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { Layout } from '@/components/layout/Layout'
import { Login } from '@/pages/auth/Login'
import { Register } from '@/pages/auth/Register'
import { Dashboard } from '@/pages/Dashboard'
import { Customers } from '@/pages/Customers'
import { Sales } from '@/pages/Sales'
import { Expenses } from '@/pages/Expenses'
import { Inventory } from '@/pages/Inventory'
import { Reports } from '@/pages/Reports'
import { Users } from '@/pages/Users'
import { Settings } from '@/pages/Settings'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">G</span>
          </div>
          <svg className="animate-spin h-6 w-6 text-primary-500 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        </div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

      {/* Protected */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"  element={<Dashboard  />} />
        <Route path="customers"  element={<Customers  />} />
        <Route path="sales"      element={<Sales      />} />
        <Route path="expenses"   element={<Expenses   />} />
        <Route path="inventory"  element={<Inventory  />} />
        <Route path="reports"    element={<Reports    />} />
        <Route path="users"      element={<Users      />} />
        <Route path="settings"   element={<Settings   />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { borderRadius: '12px', background: '#fff', color: '#111' },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  )
}
