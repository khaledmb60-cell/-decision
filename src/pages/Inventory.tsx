import { useState, useEffect } from 'react'
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/hooks/usePermissions'
import { supabase } from '@/lib/supabase'
import { Product, InventoryMovement, MovementType } from '@/types'
import { Card, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Table } from '@/components/ui/Table'
import { ArchiveBoxIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const emptyProduct = { name: '', description: '', sku: '', category: '', unit: 'unit', price: 0, cost: 0, quantity: 0, min_quantity: 0 }

export function Inventory() {
  const { tenant, profile } = useAuth()
  const { can } = usePermissions()
  const [products, setProducts]   = useState<Product[]>([])
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [tab, setTab]             = useState<'products' | 'movements'>('products')
  const [modalOpen, setModalOpen] = useState(false)
  const [moveModalOpen, setMoveModalOpen] = useState(false)
  const [editing, setEditing]     = useState<Product | null>(null)
  const [form, setForm]           = useState({ ...emptyProduct })
  const [saving, setSaving]       = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [deleting, setDeleting]   = useState(false)
  const [moveForm, setMoveForm]   = useState({ product_id: '', type: 'in' as MovementType, quantity: 1, reference: '', notes: '' })
  const [moveSaving, setMoveSaving] = useState(false)

  useEffect(() => { if (tenant) loadAll() }, [tenant])

  async function loadAll() {
    if (!tenant) return
    setLoading(true)
    const [{ data: p }, { data: m }] = await Promise.all([
      supabase.from('products').select('*').eq('tenant_id', tenant.id).order('name'),
      supabase.from('inventory_movements').select('*, product:products(name)').eq('tenant_id', tenant.id).order('created_at', { ascending: false }).limit(50),
    ])
    setProducts(p ?? [])
    setMovements(m ?? [])
    setLoading(false)
  }

  function openCreate() {
    setEditing(null)
    setForm({ ...emptyProduct })
    setModalOpen(true)
  }

  function openEdit(p: Product) {
    setEditing(p)
    setForm({ name: p.name, description: p.description ?? '', sku: p.sku ?? '', category: p.category ?? '', unit: p.unit, price: p.price, cost: p.cost, quantity: p.quantity, min_quantity: p.min_quantity })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!tenant) return
    setSaving(true)
    try {
      if (editing) {
        await supabase.from('products').update({ ...form }).eq('id', editing.id)
        toast.success('Product updated')
      } else {
        await supabase.from('products').insert({ ...form, tenant_id: tenant.id })
        toast.success('Product created')
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
    const { error } = await supabase.from('products').delete().eq('id', deleteTarget.id)
    if (error) toast.error(error.message)
    else { toast.success('Product deleted'); loadAll() }
    setDeleteTarget(null)
    setDeleting(false)
  }

  async function handleMovement() {
    if (!tenant || !profile) return
    setMoveSaving(true)
    try {
      const qty = moveForm.type === 'out' ? -Math.abs(moveForm.quantity) : Math.abs(moveForm.quantity)
      const product = products.find(p => p.id === moveForm.product_id)
      if (!product) throw new Error('Product not found')

      await supabase.from('inventory_movements').insert({
        tenant_id: tenant.id,
        product_id: moveForm.product_id,
        type: moveForm.type,
        quantity: Math.abs(moveForm.quantity),
        reference: moveForm.reference,
        notes: moveForm.notes,
        created_by: profile.id,
      })

      const newQty = moveForm.type === 'adjustment' ? moveForm.quantity : product.quantity + qty
      await supabase.from('products').update({ quantity: newQty }).eq('id', moveForm.product_id)

      toast.success('Movement recorded')
      setMoveModalOpen(false)
      loadAll()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setMoveSaving(false)
    }
  }

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: tenant?.currency ?? 'USD' }).format(n)

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.includes(search) || p.category?.toLowerCase().includes(search.toLowerCase()))
  const lowStock  = products.filter(p => p.quantity <= p.min_quantity && p.min_quantity > 0)
  const totalValue = products.reduce((s, p) => s + p.quantity * p.cost, 0)

  const productColumns: import('@/components/ui/Table').Column<Product>[] = [
    { key: 'name', header: 'Product', render: (p: Product) => (
      <div>
        <p className="font-medium text-gray-900">{p.name}</p>
        <p className="text-xs text-gray-400">{p.sku ?? p.category ?? '—'}</p>
      </div>
    )},
    { key: 'quantity', header: 'Stock', render: (p: Product) => (
      <div className="flex items-center gap-2">
        <span className="font-semibold">{p.quantity} {p.unit}</span>
        {p.quantity <= p.min_quantity && p.min_quantity > 0 && (
          <Badge variant="red">Low</Badge>
        )}
      </div>
    )},
    { key: 'price', header: 'Sell Price', render: (p: Product) => fmt(p.price) },
    { key: 'cost',  header: 'Cost',       render: (p: Product) => fmt(p.cost) },
    { key: 'value', header: 'Value',      render: (p: Product) => fmt(p.quantity * p.cost) },
    { key: 'actions', header: '', render: (p: Product) => (
      <div className="flex gap-1 justify-end" onClick={e => e.stopPropagation()}>
        {can('inventory','edit') && (
          <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50">
            <PencilIcon className="w-4 h-4" />
          </button>
        )}
        {can('inventory','delete') && (
          <button onClick={() => setDeleteTarget(p)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50">
            <TrashIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    )},
  ]

  const movementColumns: import('@/components/ui/Table').Column<InventoryMovement>[] = [
    { key: 'product', header: 'Product', render: (m: InventoryMovement) => (m.product as unknown as { name: string })?.name ?? '—' },
    { key: 'type', header: 'Type', render: (m: InventoryMovement) => (
      <div className="flex items-center gap-1">
        {m.type === 'in'  && <ArrowUpIcon   className="w-3.5 h-3.5 text-green-500" />}
        {m.type === 'out' && <ArrowDownIcon  className="w-3.5 h-3.5 text-red-500"   />}
        <Badge variant={m.type === 'in' ? 'green' : m.type === 'out' ? 'red' : 'yellow'}>{m.type}</Badge>
      </div>
    )},
    { key: 'quantity',   header: 'Qty',       render: (m: InventoryMovement) => m.quantity },
    { key: 'reference',  header: 'Reference', render: (m: InventoryMovement) => m.reference ?? '—' },
    { key: 'created_at', header: 'Date',      render: (m: InventoryMovement) => format(new Date(m.created_at), 'MMM d, yyyy') },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Products" value={products.length} icon={<ArchiveBoxIcon className="w-6 h-6 text-primary-600" />} iconBg="bg-primary-50" />
        <StatCard title="Inventory Value" value={fmt(totalValue)} icon={<ArchiveBoxIcon className="w-6 h-6 text-blue-500" />} iconBg="bg-blue-50" />
        <StatCard title="Low Stock Items" value={lowStock.length} icon={<ExclamationTriangleIcon className="w-6 h-6 text-yellow-500" />} iconBg="bg-yellow-50" changeType={lowStock.length > 0 ? 'negative' : 'positive'} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['products','movements'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex gap-3 justify-between">
        <Input
          placeholder={tab === 'products' ? 'Search products…' : 'Filter…'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          leftIcon={<MagnifyingGlassIcon className="w-4 h-4" />}
          className="w-64"
        />
        <div className="flex gap-2">
          {tab === 'products' && can('inventory','create') && (
            <Button icon={<PlusIcon className="w-4 h-4" />} onClick={openCreate}>New Product</Button>
          )}
          {can('inventory','create') && (
            <Button variant="secondary" icon={<ArrowUpIcon className="w-4 h-4" />} onClick={() => setMoveModalOpen(true)}>Record Movement</Button>
          )}
        </div>
      </div>

      <Card padding={false}>
        {tab === 'products' ? (
          <Table<Product>
            columns={productColumns}
            data={filtered}
            keyField="id"
            loading={loading}
            emptyMessage="No products found"
          />
        ) : (
          <Table<InventoryMovement>
            columns={movementColumns}
            data={movements}
            keyField="id"
            loading={loading}
            emptyMessage="No movements recorded"
          />
        )}
      </Card>

      {/* Product Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Product' : 'New Product'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            <Input label="SKU" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
            <Input label="Unit" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Sell Price" type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: +e.target.value }))} min={0} step="0.01" />
            <Input label="Cost" type="number" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: +e.target.value }))} min={0} step="0.01" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Current Stock" type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: +e.target.value }))} min={0} />
            <Input label="Min Stock (Alert)" type="number" value={form.min_quantity} onChange={e => setForm(f => ({ ...f, min_quantity: +e.target.value }))} min={0} />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-400"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* Movement Modal */}
      <Modal open={moveModalOpen} onClose={() => setMoveModalOpen(false)} title="Record Movement" size="sm">
        <div className="space-y-4">
          <Select
            label="Product"
            value={moveForm.product_id}
            onChange={e => setMoveForm(f => ({ ...f, product_id: e.target.value }))}
            options={products.map(p => ({ value: p.id, label: `${p.name} (${p.quantity} ${p.unit})` }))}
            placeholder="Select product"
          />
          <Select
            label="Movement Type"
            value={moveForm.type}
            onChange={e => setMoveForm(f => ({ ...f, type: e.target.value as MovementType }))}
            options={[
              { value: 'in',         label: 'Stock In (Receive)'   },
              { value: 'out',        label: 'Stock Out (Dispatch)'  },
              { value: 'adjustment', label: 'Adjustment (Set qty)'  },
            ]}
          />
          <Input
            label={moveForm.type === 'adjustment' ? 'New Quantity' : 'Quantity'}
            type="number"
            value={moveForm.quantity}
            onChange={e => setMoveForm(f => ({ ...f, quantity: +e.target.value }))}
            min={0}
          />
          <Input label="Reference" value={moveForm.reference} onChange={e => setMoveForm(f => ({ ...f, reference: e.target.value }))} placeholder="PO number, etc." />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setMoveModalOpen(false)}>Cancel</Button>
            <Button onClick={handleMovement} loading={moveSaving}>Record</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Product"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
      />
    </div>
  )
}
