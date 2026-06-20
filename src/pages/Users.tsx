import { useState, useEffect } from 'react'
import { PlusIcon, PencilIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/hooks/usePermissions'
import { supabase } from '@/lib/supabase'
import { Profile, UserRole, Resource, RolePermission } from '@/types'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Table } from '@/components/ui/Table'
import { buildPermissionMap } from '@/utils/permissions'
import toast from 'react-hot-toast'

const roleOptions: { value: UserRole; label: string }[] = [
  { value: 'owner',      label: 'Owner'      },
  { value: 'ceo',        label: 'CEO'        },
  { value: 'manager',    label: 'Manager'    },
  { value: 'accountant', label: 'Accountant' },
  { value: 'sales',      label: 'Sales'      },
  { value: 'operations', label: 'Operations' },
]

const roleColors: Record<UserRole, 'purple' | 'blue' | 'green' | 'yellow' | 'gray'> = {
  owner: 'purple', ceo: 'purple', manager: 'blue',
  accountant: 'green', sales: 'yellow', operations: 'gray',
}

const resources: { key: Resource; label: string }[] = [
  { key: 'dashboard',  label: 'Dashboard'  },
  { key: 'customers',  label: 'Customers'  },
  { key: 'sales',      label: 'Sales'      },
  { key: 'expenses',   label: 'Expenses'   },
  { key: 'inventory',  label: 'Inventory'  },
  { key: 'reports',    label: 'Reports'    },
  { key: 'users',      label: 'Users'      },
  { key: 'settings',   label: 'Settings'   },
]

const actions = ['view', 'create', 'edit', 'delete'] as const

export function Users() {
  const { tenant } = useAuth()
  const { can } = usePermissions()
  const [users, setUsers]     = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [permOpen, setPermOpen]     = useState(false)
  const [selectedRole, setSelectedRole] = useState<UserRole>('manager')
  const [permissions, setPermissions]   = useState<RolePermission[]>([])
  const [saving, setSaving] = useState(false)
  const [inviteForm, setInviteForm] = useState({ full_name: '', email: '', role: 'sales' as UserRole, password: '' })
  const [inviting, setInviting] = useState(false)

  useEffect(() => { if (tenant) loadAll() }, [tenant])

  async function loadAll() {
    if (!tenant) return
    setLoading(true)
    const [{ data: u }, { data: p }] = await Promise.all([
      supabase.from('profiles').select('*').eq('tenant_id', tenant.id).order('created_at'),
      supabase.from('role_permissions').select('*').eq('tenant_id', tenant.id),
    ])
    setUsers(u ?? [])
    setPermissions(p ?? [])
    setLoading(false)
  }

  async function openPermissions(role: UserRole) {
    setSelectedRole(role)
    setPermOpen(true)
  }

  function getPermValue(role: UserRole, resource: Resource, action: typeof actions[number]): boolean {
    const dbPerm = permissions.find(p => p.role === role && p.resource === resource)
    if (dbPerm) return dbPerm[`can_${action}` as keyof RolePermission] as boolean
    const map = buildPermissionMap(role, permissions)
    return map[resource][action]
  }

  async function togglePerm(resource: Resource, action: typeof actions[number]) {
    if (!tenant) return
    const current = getPermValue(selectedRole, resource, action)
    const existing = permissions.find(p => p.role === selectedRole && p.resource === resource)

    if (existing) {
      const { data } = await supabase
        .from('role_permissions')
        .update({ [`can_${action}`]: !current })
        .eq('id', existing.id)
        .select()
        .single()
      if (data) setPermissions(prev => prev.map(p => p.id === existing.id ? data : p))
    } else {
      const map = buildPermissionMap(selectedRole, permissions)
      const { data } = await supabase.from('role_permissions').insert({
        tenant_id: tenant.id,
        role: selectedRole,
        resource,
        can_view:   action === 'view'   ? !current : map[resource].view,
        can_create: action === 'create' ? !current : map[resource].create,
        can_edit:   action === 'edit'   ? !current : map[resource].edit,
        can_delete: action === 'delete' ? !current : map[resource].delete,
      }).select().single()
      if (data) setPermissions(prev => [...prev, data])
    }
  }

  async function handleInvite() {
    if (!tenant) return
    setInviting(true)
    try {
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: inviteForm.email,
        password: inviteForm.password,
        options: { data: { full_name: inviteForm.full_name } }
      })
      if (authErr) throw authErr
      const userId = authData.user?.id
      if (!userId) throw new Error('Failed to create user')

      await supabase.from('profiles').insert({
        id: userId,
        tenant_id: tenant.id,
        full_name: inviteForm.full_name,
        email: inviteForm.email,
        role: inviteForm.role,
      })

      toast.success('User invited successfully')
      setInviteOpen(false)
      setInviteForm({ full_name: '', email: '', role: 'sales', password: '' })
      loadAll()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to invite user')
    } finally {
      setInviting(false)
    }
  }

  const columns: import('@/components/ui/Table').Column<Profile>[] = [
    { key: 'full_name', header: 'User', render: (u: Profile) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-semibold">{u.full_name.charAt(0).toUpperCase()}</span>
        </div>
        <div>
          <p className="font-medium text-gray-900">{u.full_name}</p>
          <p className="text-xs text-gray-400">{u.email}</p>
        </div>
      </div>
    )},
    { key: 'role', header: 'Role', render: (u: Profile) => (
      <Badge variant={roleColors[u.role] ?? 'gray'}>{u.role}</Badge>
    )},
    { key: 'status', header: 'Status', render: (u: Profile) => (
      <Badge variant={u.is_active ? 'green' : 'red'}>{u.is_active ? 'Active' : 'Inactive'}</Badge>
    )},
    { key: 'actions', header: '', render: (u: Profile) => (
      <div className="flex gap-1 justify-end">
        {can('users','edit') && (
          <button onClick={() => openPermissions(u.role)} className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50">
            <ShieldCheckIcon className="w-3.5 h-3.5" />
            Permissions
          </button>
        )}
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{users.length} team member{users.length !== 1 ? 's' : ''}</p>
        {can('users','create') && (
          <Button icon={<PlusIcon className="w-4 h-4" />} onClick={() => setInviteOpen(true)}>Invite User</Button>
        )}
      </div>

      <Card padding={false}>
        <Table<Profile>
          columns={columns}
          data={users}
          keyField="id"
          loading={loading}
          emptyMessage="No users found"
        />
      </Card>

      {/* Role Permissions Panel */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Role Permissions</h3>
          <Select
            value={selectedRole}
            onChange={e => setSelectedRole(e.target.value as UserRole)}
            options={roleOptions}
            className="w-40"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 pr-4 text-gray-500 font-medium">Resource</th>
                {actions.map(a => (
                  <th key={a} className="text-center py-2 px-4 text-gray-500 font-medium capitalize">{a}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resources.map(res => (
                <tr key={res.key} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 pr-4 font-medium text-gray-700">{res.label}</td>
                  {actions.map(action => {
                    const enabled = getPermValue(selectedRole, res.key, action)
                    return (
                      <td key={action} className="py-3 px-4 text-center">
                        <button
                          onClick={() => can('users','edit') && togglePerm(res.key, action)}
                          disabled={!can('users','edit')}
                          className={`w-9 h-5 rounded-full transition-colors relative ${enabled ? 'bg-primary-500' : 'bg-gray-200'} ${can('users','edit') ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'left-4' : 'left-0.5'}`} />
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Invite Modal */}
      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite Team Member">
        <div className="space-y-4">
          <Input label="Full Name" value={inviteForm.full_name} onChange={e => setInviteForm(f => ({ ...f, full_name: e.target.value }))} required />
          <Input label="Email" type="email" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} required />
          <Input label="Temporary Password" type="password" value={inviteForm.password} onChange={e => setInviteForm(f => ({ ...f, password: e.target.value }))} minLength={8} required />
          <Select
            label="Role"
            value={inviteForm.role}
            onChange={e => setInviteForm(f => ({ ...f, role: e.target.value as UserRole }))}
            options={roleOptions}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={handleInvite} loading={inviting}>Send Invite</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
