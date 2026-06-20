import { useState, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  CurrencyDollarIcon, UsersIcon, ShoppingCartIcon, ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, StatCard } from '@/components/ui/Card'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'

const COLORS = ['#22c55e','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#06b6d4']

export function Dashboard() {
  const { tenant } = useAuth()
  const [stats, setStats] = useState({ revenue: 0, expenses: 0, customers: 0, orders: 0 })
  const [monthlyData, setMonthlyData] = useState<{ month: string; revenue: number; expenses: number }[]>([])
  const [statusData, setStatusData] = useState<{ name: string; value: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenant) return
    loadData()
  }, [tenant])

  async function loadData() {
    if (!tenant) return
    setLoading(true)

    const [
      { count: customers },
      { data: orders },
      { data: expenses },
    ] = await Promise.all([
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
      supabase.from('sales_orders').select('status,total,created_at').eq('tenant_id', tenant.id),
      supabase.from('expenses').select('amount,date').eq('tenant_id', tenant.id),
    ])

    const totalRevenue  = (orders ?? []).filter(o => o.status === 'completed').reduce((s, o) => s + o.total, 0)
    const totalExpenses = (expenses ?? []).reduce((s, e) => s + e.amount, 0)
    const totalOrders   = (orders ?? []).length

    setStats({ revenue: totalRevenue, expenses: totalExpenses, customers: customers ?? 0, orders: totalOrders })

    // Monthly chart data (last 6 months)
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), 5 - i)
      return { month: format(d, 'MMM'), start: startOfMonth(d).toISOString(), end: endOfMonth(d).toISOString() }
    })

    const monthly = months.map(m => {
      const rev = (orders ?? [])
        .filter(o => o.status === 'completed' && o.created_at >= m.start && o.created_at <= m.end)
        .reduce((s, o) => s + o.total, 0)
      const exp = (expenses ?? [])
        .filter(e => e.date >= m.start.slice(0, 10) && e.date <= m.end.slice(0, 10))
        .reduce((s, e) => s + e.amount, 0)
      return { month: m.month, revenue: rev, expenses: exp }
    })
    setMonthlyData(monthly)

    // Status breakdown
    const statusMap: Record<string, number> = {}
    for (const o of orders ?? []) {
      statusMap[o.status] = (statusMap[o.status] ?? 0) + 1
    }
    setStatusData(Object.entries(statusMap).map(([name, value]) => ({ name, value })))

    setLoading(false)
  }

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: tenant?.currency ?? 'USD', maximumFractionDigits: 0 }).format(n)

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={fmt(stats.revenue)}
          icon={<CurrencyDollarIcon className="w-6 h-6 text-primary-600" />}
          iconBg="bg-primary-50"
          change="Completed orders"
          changeType="positive"
        />
        <StatCard
          title="Total Expenses"
          value={fmt(stats.expenses)}
          icon={<ArrowTrendingUpIcon className="w-6 h-6 text-red-500" />}
          iconBg="bg-red-50"
          change={`Profit: ${fmt(stats.revenue - stats.expenses)}`}
          changeType={stats.revenue > stats.expenses ? 'positive' : 'negative'}
        />
        <StatCard
          title="Customers"
          value={stats.customers.toLocaleString()}
          icon={<UsersIcon className="w-6 h-6 text-blue-500" />}
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Total Orders"
          value={stats.orders.toLocaleString()}
          icon={<ShoppingCartIcon className="w-6 h-6 text-purple-500" />}
          iconBg="bg-purple-50"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <h3 className="font-semibold text-gray-900 mb-4">Revenue vs Expenses</h3>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">Loading…</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Area type="monotone" dataKey="revenue"  stroke="#22c55e" fill="url(#colorRevenue)"  strokeWidth={2} name="Revenue" />
                <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="url(#colorExpenses)" strokeWidth={2} name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Orders by Status</h3>
          {loading || statusData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
              {loading ? 'Loading…' : 'No orders yet'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Quick summary */}
      <Card>
        <h3 className="font-semibold text-gray-900 mb-1">Financial Summary</h3>
        <p className="text-sm text-gray-500 mb-4">Net position across all periods</p>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-xl">
            <p className="text-xs text-gray-500 mb-1">Total Revenue</p>
            <p className="text-xl font-bold text-green-700">{fmt(stats.revenue)}</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-xl">
            <p className="text-xs text-gray-500 mb-1">Total Expenses</p>
            <p className="text-xl font-bold text-red-700">{fmt(stats.expenses)}</p>
          </div>
          <div className={`text-center p-4 rounded-xl ${stats.revenue >= stats.expenses ? 'bg-primary-50' : 'bg-orange-50'}`}>
            <p className="text-xs text-gray-500 mb-1">Net Profit</p>
            <p className={`text-xl font-bold ${stats.revenue >= stats.expenses ? 'text-primary-700' : 'text-orange-700'}`}>
              {fmt(stats.revenue - stats.expenses)}
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
