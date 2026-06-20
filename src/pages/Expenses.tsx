import { useState, useEffect } from 'react'
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/hooks/usePermissions'
import { supabase } from '@/lib/supabase'
import { Expense, ExpenseCategory, ExpenseStatus } from '@/types'
import { Card, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge, statusBadgeVariant } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Table } from '@/components/ui/Table'
import { CreditCardIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const statusOptions = [
  { value: 'pending',  label: 'Pending'  },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

const emptyForm = { category_id: '', title: '', amount: 0, date: new Date().toISOString().slice(0, 10), notes: '', status: 'pending' as ExpenseStatus }

export function Expenses() {
  const { tenant, profile } = useAuth()
  const { can } = usePermissions()
  const [expenses, setExpenses]     = useState<Expense[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modalOpen, setModalOpen]   = useState(false)
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [editing, setEditing]       = useState<Expense | null>(null)
  const [form, setForm]             = useState({ ...emptyForm })
  const [saving, setSaving]         = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null)
  const [deleting, setDeleting]     = useState(false)
  const [catName, setCatName]       = useState('')
  const [catColor, setCatColor]     = useState('#22c55e')
  const [catSaving, setCatSaving]   = useState(false)

  useEffect(() => { if (tenant) loadAll() }, [tenant])

  async function loadAll() {
    if (!tenant) return
    setLoading(true)
    const [{ data: e }, { data: c }] = await Promise.all([
      supabase.from('expenses').select('*, category:expense_categories(name,color)').eq('tenant_id', tenant.id).order('date', { ascending: false }),
      supabase.from('expense_categories').select('*').eq('tenant_id', tenant.id),
    ])
    setExpenses(e ?? [])
    setCategories(c ?? [])
    setLoading(false)
  }

  function openCreate() {
    setEditing(null)
    setForm({ ...emptyForm })
    setModalOpen(true)
  }

  function openEdit(e: Expense) {
    setEditing(e)
    setForm({ category_id: e.category_id ?? '', title: e.title, amount: e.amount, date: e.date, notes: e.notes ?? '', status: e.status })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!tenant || !profile) return
    setSaving(true)
    try {
      if (editing) {
        await supabase.from('expenses').update({ ...form }).eq('id', editing.id)
        toast.success('Expense updated')
      } else {
        await supabase.from('expenses').insert({ ...form, tenant_id: tenant.id, created_by: profile.id })
        toast.success('Expense added')
      }
      setModalOpen(false)
      loadAll()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const { error } = await supabase.from('expenses').delete().eq('id', deleteTarget.id)
    if (error) toast.error(error.message)
    else { toast.success('Expense deleted'); loadAll() }
    setDeleteTarget(null)
    setDeleting(false)
  }

  async function handleAddCategory() {
    if (!tenant || !catName.trim()) return
    setCatSaving(true)
    await supabase.from('expense_categories').insert({ tenant_id: tenant.id, name: catName, color: catColor })
    setCatName('')
    setCatColor('#22c55e')
    setCatModalOpen(false)
    setCatSaving(false)
    loadAll()
    toast.success('Category added')
  }

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: tenant?.currency ?? 'USD' }).format(n)

  const filtered = expenses.filter(e =>
    e.title.toLowerCase().includes(search.toLowerCase()) &&
    (statusFilter === '' || e.status === statusFilter)
  )

  const totalPending  = expenses.filter(e => e.status === 'pending').reduce((s, e) => s + e.amount, 0)
  const totalApproved = expenses.filter(e => e.status === 'approved').reduce((s, e) => s + e.amount, 0)
  const totalAll      = expenses.reduce((s, e) => s + e.amount, 0)

  const columns: import('@/components/ui/Table').Column<Expense>[] = [
    { key: 'title', header: 'Title', render: (e: Expense) => (
      <div>
        <p className="font-medium text-gray-900">{e.title}</p>
        {e.category && (
          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: (e.category as unknown as ExpenseCategory).color }} />
            {(e.category as unknown as ExpenseCategory).name}
          </span>
        )}
      </div>
    )},
    { key: 'amount', header: 'Amount', render: (e: Expense) => <span className="font-semibold">{fmt(e.amount)}</span> },
    { key: 'date',   header: 'Date',   render: (e: Expense) => format(new Date(e.date), 'MMM d, yyyy') },
    { key: 'status', header: 'Status', render: (e: Expense) => <Badge variant={statusBadgeVariant(e.status)}>{e.status}</Badge> },
    { key: 'actions', header: '', render: (e: Expense) => (
      <div className="flex gap-1 justify-end" onClick={ev => ev.stopPropagation()}>
        {can('expenses','edit') && (
          <button onClick={() => openEdit(e)} className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50">
            <PencilIcon className="w-4 h-4" />
          </button>
        )}
        {can('expenses','delete') && (
          <button onClick={() => setDeleteTarget(e)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50">
            <TrashIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Expenses" value={fmt(totalAll)} icon={<CreditCardIcon className="w-6 h-6 text-primary-600" />} iconBg="bg-primary-50" />
        <StatCard title="Pending Approval" value={fmt(totalPending)} icon={<ClockIcon className="w-6 h-6 text-yellow-500" />} iconBg="bg-yellow-50" />
        <StatCard title="Approved" value={fmt(totalApproved)} icon={<CheckCircleIcon className="w-6 h-6 text-green-500" />} iconBg="bg-green-50" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex gap-3">
          <Input
            placeholder="Search expenses…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            leftIcon={<MagnifyingGlassIcon className="w-4 h-4" />}
            className="w-56"
          />
          <Select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            options={statusOptions}
            placeholder="All statuses"
            className="w-40"
          />
        </div>
        <div className="flex gap-2">
          {can('expenses','create') && (
            <>
              <Button variant="secondary" onClick={() => setCatModalOpen(true)}>+ Category</Button>
              <Button icon={<PlusIcon className="w-4 h-4" />} onClick={openCreate}>Add Expense</Button>
            </>
          )}
        </div>
      </div>

      <Card padding={false}>
        <Table<Expense>
          columns={columns}
          data={filtered}
          keyField="id"
          loading={loading}
          emptyMessage="No expenses found"
        />
      </Card>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Expense' : 'Add Expense'}>
        <div className="space-y-4">
          <Input label="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Amount" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: +e.target.value }))} min={0} step="0.01" />
            <Input label="Date" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Category"
              value={form.category_id}
              onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
              options={categories.map(c => ({ value: c.id, label: c.name }))}
              placeholder="No category"
            />
            <Select
              label="Status"
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as ExpenseStatus }))}
              options={statusOptions}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-400"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* Add Category Modal */}
      <Modal open={catModalOpen} onClose={() => setCatModalOpen(false)} title="New Category" size="sm">
        <div className="space-y-4">
          <Input label="Name" value={catName} onChange={e => setCatName(e.target.value)} />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Color</label>
            <input type="color" value={catColor} onChange={e => setCatColor(e.target.value)} className="h-10 w-full rounded-lg border border-gray-300 cursor-pointer" />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setCatModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddCategory} loading={catSaving}>Add</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Expense"
        message={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
      />
    </div>
  )
}
