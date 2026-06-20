import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns'

const COLORS = ['#22c55e','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899']

const periodOptions = [
  { value: '3',  label: 'Last 3 months'  },
  { value: '6',  label: 'Last 6 months'  },
  { value: '12', label: 'Last 12 months' },
]

export function Reports() {
  const { tenant } = useAuth()
  const [period, setPeriod]         = useState('6')
  const [loading, setLoading]       = useState(true)
  const [monthlyRevenue, setMonthlyRevenue] = useState<{ month: string; revenue: number; expenses: number; profit: number }[]>([])
  const [expenseByCategory, setExpenseByCategory] = useState<{ name: string; value: number }[]>([])
  const [customerGrowth, setCustomerGrowth]       = useState<{ month: string; total: number }[]>([])
  const [topProducts, setTopProducts] = useState<{ name: string; revenue: number; quantity: number }[]>([])
  const [summary, setSummary]       = useState({ revenue: 0, expenses: 0, profit: 0, customers: 0 })

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: tenant?.currency ?? 'USD', maximumFractionDigits: 0 }).format(n)

  useEffect(() => { if (tenant) loadReport() }, [tenant, period])

  async function loadReport() {
    if (!tenant) return
    setLoading(true)
    const months = +period
    const startDate = startOfMonth(subMonths(new Date(), months - 1)).toISOString()

    const [{ data: orders }, { data: expenses }, { data: customers }, { data: orderItems }] = await Promise.all([
      supabase.from('sales_orders').select('status,total,created_at').eq('tenant_id', tenant.id).gte('created_at', startDate),
      supabase.from('expenses').select('amount,date,category:expense_categories(name)').eq('tenant_id', tenant.id).gte('date', startDate.slice(0, 10)),
      supabase.from('customers').select('created_at').eq('tenant_id', tenant.id),
      supabase.from('sales_order_items').select('description,quantity,total,order:sales_orders!inner(tenant_id,status)').eq('order.tenant_id', tenant.id).eq('order.status', 'completed'),
    ])

    // Monthly revenue & expenses
    const mArr = Array.from({ length: months }, (_, i) => {
      const d = subMonths(new Date(), months - 1 - i)
      return { month: format(d, 'MMM yy'), start: startOfMonth(d).toISOString(), end: endOfMonth(d).toISOString() }
    })

    const monthly = mArr.map(m => {
      const rev = (orders ?? []).filter(o => o.status === 'completed' && o.created_at >= m.start && o.created_at <= m.end).reduce((s, o) => s + o.total, 0)
      const exp = (expenses ?? []).filter(e => e.date >= m.start.slice(0, 10) && e.date <= m.end.slice(0, 10)).reduce((s, e) => s + e.amount, 0)
      return { month: m.month, revenue: rev, expenses: exp, profit: rev - exp }
    })
    setMonthlyRevenue(monthly)

    // Expense by category
    const catMap: Record<string, number> = {}
    for (const e of expenses ?? []) {
      const name = (e.category as unknown as { name: string })?.name ?? 'Uncategorized'
      catMap[name] = (catMap[name] ?? 0) + e.amount
    }
    setExpenseByCategory(Object.entries(catMap).map(([name, value]) => ({ name, value })))

    // Customer growth
    const cGrowth = mArr.map(m => {
      const total = (customers ?? []).filter(c => c.created_at <= m.end).length
      return { month: m.month, total }
    })
    setCustomerGrowth(cGrowth)

    // Top products
    const prodMap: Record<string, { revenue: number; quantity: number }> = {}
    for (const item of orderItems ?? []) {
      const k = item.description ?? 'Unknown'
      if (!prodMap[k]) prodMap[k] = { revenue: 0, quantity: 0 }
      prodMap[k].revenue   += item.total
      prodMap[k].quantity  += item.quantity
    }
    const top = Object.entries(prodMap)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
    setTopProducts(top)

    // Summary
    const totalRev = (orders ?? []).filter(o => o.status === 'completed').reduce((s, o) => s + o.total, 0)
    const totalExp = (expenses ?? []).reduce((s, e) => s + e.amount, 0)
    setSummary({ revenue: totalRev, expenses: totalExp, profit: totalRev - totalExp, customers: customers?.length ?? 0 })

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <svg className="animate-spin h-8 w-8 text-primary-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">Financial & operational analytics</p>
        <Select
          value={period}
          onChange={e => setPeriod(e.target.value)}
          options={periodOptions}
          className="w-44"
        />
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Revenue', value: fmt(summary.revenue), color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Expenses', value: fmt(summary.expenses), color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Net Profit', value: fmt(summary.profit), color: summary.profit >= 0 ? 'text-primary-600' : 'text-orange-600', bg: summary.profit >= 0 ? 'bg-primary-50' : 'bg-orange-50' },
          { label: 'Customers', value: summary.customers.toString(), color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map(k => (
          <Card key={k.label}>
            <p className="text-xs text-gray-500 mb-1">{k.label}</p>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </Card>
        ))}
      </div>

      {/* Revenue chart */}
      <Card>
        <h3 className="font-semibold text-gray-900 mb-4">Revenue vs Expenses vs Profit</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthlyRevenue}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => fmt(v)} />
            <Legend />
            <Bar dataKey="revenue"  fill="#22c55e" radius={[4,4,0,0]} name="Revenue"  />
            <Bar dataKey="expenses" fill="#ef4444" radius={[4,4,0,0]} name="Expenses" />
            <Bar dataKey="profit"   fill="#3b82f6" radius={[4,4,0,0]} name="Profit"   />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Expense by category */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Expense Breakdown</h3>
          {expenseByCategory.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">No expense data</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={expenseByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {expenseByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Customer growth */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Customer Growth</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={customerGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Customers" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Top products */}
      <Card>
        <h3 className="font-semibold text-gray-900 mb-4">Top Products by Revenue</h3>
        {topProducts.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No completed orders yet</p>
        ) : (
          <div className="space-y-3">
            {topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center gap-4">
                <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                  <div className="mt-1 h-1.5 bg-gray-100 rounded-full">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${(p.revenue / (topProducts[0]?.revenue || 1)) * 100}%`,
                        backgroundColor: COLORS[i % COLORS.length],
                      }}
                    />
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-gray-900">{fmt(p.revenue)}</p>
                  <p className="text-xs text-gray-400">{p.quantity} units</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
