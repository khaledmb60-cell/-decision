import { useState, useEffect } from 'react'
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/hooks/usePermissions'
import { supabase } from '@/lib/supabase'
import { Customer } from '@/types'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge, statusBadgeVariant } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Table } from '@/components/ui/Table'
import toast from 'react-hot-toast'

const emptyForm = { name: '', email: '', phone: '', address: '', notes: '', type: 'individual' as 'individual' | 'company' }

export function Customers() {
  const { tenant } = useAuth()
  const { can } = usePermissions()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState<{ name: string; email: string; phone: string; address: string; notes: string; type: 'individual' | 'company' }>({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { if (tenant) load() }, [tenant])

  async function load() {
    if (!tenant) return
    setLoading(true)
    const { data } = await supabase
      .from('customers').select('*').eq('tenant_id', tenant.id).order('created_at', { ascending: false })
    setCustomers(data ?? [])
    setLoading(false)
  }

  function openCreate() {
    setEditing(null)
    setForm({ ...emptyForm })
    setModalOpen(true)
  }

  function openEdit(c: Customer) {
    setEditing(c)
    setForm({ name: c.name, email: c.email ?? '', phone: c.phone ?? '', address: c.address ?? '', notes: c.notes ?? '', type: c.type })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!tenant) return
    setSaving(true)
    try {
      if (editing) {
        const { error } = await supabase.from('customers').update({ ...form }).eq('id', editing.id)
        if (error) throw error
        toast.success('Customer updated')
      } else {
        const { error } = await supabase.from('customers').insert({ ...form, tenant_id: tenant.id })
        if (error) throw error
        toast.success('Customer created')
      }
      setModalOpen(false)
      load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const { error } = await supabase.from('customers').delete().eq('id', deleteTarget.id)
    if (error) toast.error(error.message)
    else { toast.success('Customer deleted'); load() }
    setDeleteTarget(null)
    setDeleting(false)
  }

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  )

  const columns: import('@/components/ui/Table').Column<Customer>[] = [
    { key: 'name', header: 'Name', render: (c: Customer) => (
      <div>
        <p className="font-medium text-gray-900">{c.name}</p>
        <p className="text-xs text-gray-400">{c.email}</p>
      </div>
    )},
    { key: 'phone',   header: 'Phone',   render: (c: Customer) => c.phone ?? '—' },
    { key: 'type',    header: 'Type',    render: (c: Customer) => <Badge variant="blue">{c.type}</Badge> },
    { key: 'status',  header: 'Status',  render: (c: Customer) => (
      <Badge variant={statusBadgeVariant(c.is_active ? 'active' : 'inactive')}>
        {c.is_active ? 'Active' : 'Inactive'}
      </Badge>
    )},
    { key: 'actions', header: '', render: (c: Customer) => (
      <div className="flex gap-1 justify-end" onClick={e => e.stopPropagation()}>
        {can('customers','edit') && (
          <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
            <PencilIcon className="w-4 h-4" />
          </button>
        )}
        {can('customers','delete') && (
          <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
            <TrashIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <Input
          placeholder="Search customers…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          leftIcon={<MagnifyingGlassIcon className="w-4 h-4" />}
          className="sm:w-72"
        />
        {can('customers','create') && (
          <Button icon={<PlusIcon className="w-4 h-4" />} onClick={openCreate}>New Customer</Button>
        )}
      </div>

      <Card padding={false}>
        <Table<Customer>
          columns={columns}
          data={filtered}
          keyField="id"
          loading={loading}
          emptyMessage="No customers found"
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Customer' : 'New Customer'}>
        <div className="space-y-4">
          <Input label="Full Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          <Select
            label="Type"
            value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value as 'individual' | 'company' }))}
            options={[{ value: 'individual', label: 'Individual' }, { value: 'company', label: 'Company' }]}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            <Input label="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <Input label="Address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-400"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>Save</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Customer"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
      />
    </div>
  )
}
