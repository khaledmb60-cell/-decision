import { useState, useEffect } from 'react'
import { PlusIcon, MagnifyingGlassIcon, EyeIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/hooks/usePermissions'
import { supabase } from '@/lib/supabase'
import { SalesOrder, Customer, Product, OrderStatus } from '@/types'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge, statusBadgeVariant } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Table } from '@/components/ui/Table'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

interface OrderItem {
  product_id: string
  description: string
  quantity: number
  unit_price: number
  discount: number
}

const emptyItem = (): OrderItem => ({ product_id: '', description: '', quantity: 1, unit_price: 0, discount: 0 })

export function Sales() {
  const { tenant, profile } = useAuth()
  const { can } = usePermissions()
  const [orders, setOrders]       = useState<SalesOrder[]>([])
  const [customers, setCustomers] = useState<Pick<Customer, 'id' | 'name'>[]>([])
  const [products, setProducts]   = useState<Pick<Product, 'id' | 'name' | 'price'>[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [viewOrder, setViewOrder] = useState<SalesOrder | null>(null)
  const [editing, setEditing]     = useState<SalesOrder | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SalesOrder | null>(null)
  const [deleting, setDeleting]   = useState(false)
  const [saving, setSaving]       = useState(false)

  const [form, setForm] = useState({
    customer_id: '', status: 'draft' as OrderStatus,
    tax: 0, discount: 0, notes: '', due_date: '',
  })
  const [items, setItems] = useState<OrderItem[]>([emptyItem()])

  useEffect(() => { if (tenant) loadAll() }, [tenant])

  async function loadAll() {
    if (!tenant) return
    setLoading(true)
    const [{ data: o }, { data: c }, { data: p }] = await Promise.all([
      supabase.from('sales_orders').select('*, customer:customers(name)').eq('tenant_id', tenant.id).order('created_at', { ascending: false }),
      supabase.from('customers').select('id,name').eq('tenant_id', tenant.id).eq('is_active', true),
      supabase.from('products').select('id,name,price').eq('tenant_id', tenant.id).eq('is_active', true),
    ])
    setOrders(o ?? [])
    setCustomers(c ?? [])
    setProducts(p ?? [])
    setLoading(false)
  }

  function calcTotals() {
    const subtotal = items.reduce((s, i) => s + (i.quantity * i.unit_price - i.discount), 0)
    const total = subtotal + form.tax - form.discount
    return { subtotal, total: Math.max(0, total) }
  }

  function openCreate() {
    setEditing(null)
    setForm({ customer_id: '', status: 'draft', tax: 0, discount: 0, notes: '', due_date: '' })
    setItems([emptyItem()])
    setModalOpen(true)
  }

  function openEdit(o: SalesOrder) {
    setEditing(o)
    setForm({
      customer_id: o.customer_id ?? '',
      status: o.status,
      tax: o.tax, discount: o.discount,
      notes: o.notes ?? '', due_date: o.due_date ?? '',
    })
    setItems(o.items?.map(i => ({
      product_id: i.product_id ?? '', description: i.description,
      quantity: i.quantity, unit_price: i.unit_price, discount: i.discount,
    })) ?? [emptyItem()])
    setModalOpen(true)
  }

  function updateItem(idx: number, field: keyof OrderItem, value: string | number) {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      const updated = { ...item, [field]: value }
      if (field === 'product_id') {
        const prod = products.find(p => p.id === value)
        if (prod) { updated.description = prod.name; updated.unit_price = prod.price }
      }
      return updated
    }))
  }

  async function handleSave() {
    if (!tenant || !profile) return
    setSaving(true)
    try {
      const { subtotal, total } = calcTotals()
      const orderNum = editing?.order_number ?? `ORD-${Date.now()}`

      if (editing) {
        await supabase.from('sales_orders').update({
          ...form, subtotal, total, order_number: orderNum,
        }).eq('id', editing.id)
        await supabase.from('sales_order_items').delete().eq('order_id', editing.id)
        await supabase.from('sales_order_items').insert(
          items.map(i => ({ ...i, order_id: editing.id, total: i.quantity * i.unit_price - i.discount }))
        )
        toast.success('Order updated')
      } else {
        const { data: newOrder } = await supabase.from('sales_orders').insert({
          ...form, tenant_id: tenant.id, subtotal, total,
          order_number: orderNum, created_by: profile.id,
        }).select().single()
        if (newOrder) {
          await supabase.from('sales_order_items').insert(
            items.map(i => ({ ...i, order_id: newOrder.id, total: i.quantity * i.unit_price - i.discount }))
          )
        }
        toast.success('Order created')
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
    const { error } = await supabase.from('sales_orders').delete().eq('id', deleteTarget.id)
    if (error) toast.error(error.message)
    else { toast.success('Order deleted'); loadAll() }
    setDeleteTarget(null)
    setDeleting(false)
  }

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: tenant?.currency ?? 'USD' }).format(n)

  const filtered = orders.filter(o =>
    (o.order_number.toLowerCase().includes(search.toLowerCase()) ||
     (o.customer as unknown as { name: string })?.name?.toLowerCase().includes(search.toLowerCase())) &&
    (statusFilter === '' || o.status === statusFilter)
  )

  const columns: import('@/components/ui/Table').Column<SalesOrder>[] = [
    { key: 'order_number', header: 'Order #', render: (o: SalesOrder) => (
      <span className="font-mono font-medium text-gray-900">{o.order_number}</span>
    )},
    { key: 'customer', header: 'Customer', render: (o: SalesOrder) =>
      (o.customer as unknown as { name: string })?.name ?? '—'
    },
    { key: 'status', header: 'Status', render: (o: SalesOrder) => (
      <Badge variant={statusBadgeVariant(o.status)}>{o.status}</Badge>
    )},
    { key: 'total', header: 'Total', render: (o: SalesOrder) => fmt(o.total) },
    { key: 'created_at', header: 'Date', render: (o: SalesOrder) => format(new Date(o.created_at), 'MMM d, yyyy') },
    { key: 'actions', header: '', render: (o: SalesOrder) => (
      <div className="flex gap-1 justify-end" onClick={e => e.stopPropagation()}>
        <button onClick={() => setViewOrder(o)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
          <EyeIcon className="w-4 h-4" />
        </button>
        {can('sales','edit') && (
          <button onClick={() => openEdit(o)} className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
            <PencilIcon className="w-4 h-4" />
          </button>
        )}
        {can('sales','delete') && (
          <button onClick={() => setDeleteTarget(o)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
            <TrashIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    )},
  ]

  const { subtotal, total } = calcTotals()

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex gap-3">
          <Input
            placeholder="Search orders…"
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
        {can('sales','create') && (
          <Button icon={<PlusIcon className="w-4 h-4" />} onClick={openCreate}>New Order</Button>
        )}
      </div>

      <Card padding={false}>
        <Table<SalesOrder>
          columns={columns}
          data={filtered}
          keyField="id"
          loading={loading}
          emptyMessage="No orders found"
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Order' : 'New Order'} size="xl">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Customer"
              value={form.customer_id}
              onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}
              options={customers.map(c => ({ value: c.id, label: c.name }))}
              placeholder="Select customer"
            />
            <Select
              label="Status"
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as OrderStatus }))}
              options={statusOptions}
            />
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Items</label>
              <button onClick={() => setItems(p => [...p, emptyItem()])} className="text-xs text-primary-600 font-medium hover:text-primary-700">+ Add item</button>
            </div>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4">
                    <Select
                      value={item.product_id}
                      onChange={e => updateItem(idx, 'product_id', e.target.value)}
                      options={products.map(p => ({ value: p.id, label: p.name }))}
                      placeholder="Product"
                    />
                  </div>
                  <div className="col-span-3">
                    <Input placeholder="Description" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <Input type="number" placeholder="Qty" value={item.quantity} onChange={e => updateItem(idx, 'quantity', +e.target.value)} min={1} />
                  </div>
                  <div className="col-span-2">
                    <Input type="number" placeholder="Price" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', +e.target.value)} min={0} />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    {items.length > 1 && (
                      <button onClick={() => setItems(p => p.filter((_, i) => i !== idx))} className="p-1 text-red-400 hover:text-red-600">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium">{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Tax</span>
              <Input type="number" value={form.tax} onChange={e => setForm(f => ({ ...f, tax: +e.target.value }))} className="w-28 text-right" min={0} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Discount</span>
              <Input type="number" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: +e.target.value }))} className="w-28 text-right" min={0} />
            </div>
            <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-2">
              <span>Total</span>
              <span className="text-primary-600">{fmt(total)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Due Date" type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-400"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>Save Order</Button>
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      {viewOrder && (
        <Modal open={!!viewOrder} onClose={() => setViewOrder(null)} title={`Order ${viewOrder.order_number}`} size="lg">
          <div className="space-y-4">
            <div className="flex gap-4 text-sm">
              <div><span className="text-gray-500">Status: </span><Badge variant={statusBadgeVariant(viewOrder.status)}>{viewOrder.status}</Badge></div>
              <div><span className="text-gray-500">Date: </span>{format(new Date(viewOrder.created_at), 'MMM d, yyyy')}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{fmt(viewOrder.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>{fmt(viewOrder.tax)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Discount</span><span>-{fmt(viewOrder.discount)}</span></div>
              <div className="flex justify-between font-bold border-t pt-2"><span>Total</span><span className="text-primary-600">{fmt(viewOrder.total)}</span></div>
            </div>
            {viewOrder.notes && <p className="text-sm text-gray-600">{viewOrder.notes}</p>}
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Order"
        message={`Delete order "${deleteTarget?.order_number}"? This cannot be undone.`}
      />
    </div>
  )
}
