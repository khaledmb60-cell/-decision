import { UserRole, Resource, RolePermission } from '@/types'

const DEFAULT_PERMISSIONS: Record<UserRole, Record<Resource, { view: boolean; create: boolean; edit: boolean; delete: boolean }>> = {
  owner: {
    dashboard: { view: true, create: true, edit: true, delete: true },
    customers:  { view: true, create: true, edit: true, delete: true },
    sales:      { view: true, create: true, edit: true, delete: true },
    expenses:   { view: true, create: true, edit: true, delete: true },
    inventory:  { view: true, create: true, edit: true, delete: true },
    reports:    { view: true, create: true, edit: true, delete: true },
    users:      { view: true, create: true, edit: true, delete: true },
    settings:   { view: true, create: true, edit: true, delete: true },
  },
  ceo: {
    dashboard: { view: true, create: true, edit: true, delete: true },
    customers:  { view: true, create: true, edit: true, delete: true },
    sales:      { view: true, create: true, edit: true, delete: true },
    expenses:   { view: true, create: true, edit: true, delete: true },
    inventory:  { view: true, create: true, edit: true, delete: true },
    reports:    { view: true, create: true, edit: true, delete: true },
    users:      { view: true, create: true, edit: true, delete: true },
    settings:   { view: true, create: true, edit: true, delete: true },
  },
  manager: {
    dashboard: { view: true, create: true, edit: true, delete: true },
    customers:  { view: true, create: true, edit: true, delete: true },
    sales:      { view: true, create: true, edit: true, delete: true },
    expenses:   { view: true, create: true, edit: true, delete: true },
    inventory:  { view: true, create: true, edit: true, delete: true },
    reports:    { view: true, create: true, edit: true, delete: true },
    users:      { view: true, create: true, edit: true, delete: false },
    settings:   { view: true, create: true, edit: true, delete: false },
  },
  accountant: {
    dashboard: { view: true,  create: false, edit: false, delete: false },
    customers:  { view: true,  create: false, edit: false, delete: false },
    sales:      { view: true,  create: true,  edit: true,  delete: false },
    expenses:   { view: true,  create: true,  edit: true,  delete: false },
    inventory:  { view: true,  create: false, edit: false, delete: false },
    reports:    { view: true,  create: false, edit: false, delete: false },
    users:      { view: false, create: false, edit: false, delete: false },
    settings:   { view: false, create: false, edit: false, delete: false },
  },
  sales: {
    dashboard: { view: true,  create: false, edit: false, delete: false },
    customers:  { view: true,  create: true,  edit: true,  delete: false },
    sales:      { view: true,  create: true,  edit: true,  delete: false },
    expenses:   { view: false, create: false, edit: false, delete: false },
    inventory:  { view: true,  create: false, edit: false, delete: false },
    reports:    { view: false, create: false, edit: false, delete: false },
    users:      { view: false, create: false, edit: false, delete: false },
    settings:   { view: false, create: false, edit: false, delete: false },
  },
  operations: {
    dashboard: { view: true,  create: false, edit: false, delete: false },
    customers:  { view: true,  create: false, edit: false, delete: false },
    sales:      { view: false, create: false, edit: false, delete: false },
    expenses:   { view: false, create: false, edit: false, delete: false },
    inventory:  { view: true,  create: true,  edit: true,  delete: false },
    reports:    { view: false, create: false, edit: false, delete: false },
    users:      { view: false, create: false, edit: false, delete: false },
    settings:   { view: false, create: false, edit: false, delete: false },
  },
}

export function getDefaultPermission(role: UserRole, resource: Resource, action: 'view' | 'create' | 'edit' | 'delete') {
  return DEFAULT_PERMISSIONS[role]?.[resource]?.[action] ?? false
}

export function buildPermissionMap(
  role: UserRole,
  dbPermissions: RolePermission[]
): Record<Resource, { view: boolean; create: boolean; edit: boolean; delete: boolean }> {
  const resources: Resource[] = ['dashboard','customers','sales','expenses','inventory','reports','users','settings']
  const map: Partial<Record<Resource, { view: boolean; create: boolean; edit: boolean; delete: boolean }>> = {}

  for (const res of resources) {
    const db = dbPermissions.find(p => p.role === role && p.resource === res)
    if (db) {
      map[res] = { view: db.can_view, create: db.can_create, edit: db.can_edit, delete: db.can_delete }
    } else {
      map[res] = {
        view:   getDefaultPermission(role, res, 'view'),
        create: getDefaultPermission(role, res, 'create'),
        edit:   getDefaultPermission(role, res, 'edit'),
        delete: getDefaultPermission(role, res, 'delete'),
      }
    }
  }

  return map as Record<Resource, { view: boolean; create: boolean; edit: boolean; delete: boolean }>
}
