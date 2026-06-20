export type BusinessType = 'nursery' | 'construction' | 'car_wash' | 'laundry' | 'logistics'

export type UserRole = 'owner' | 'ceo' | 'manager' | 'accountant' | 'sales' | 'operations'

export type OrderStatus = 'draft' | 'pending' | 'confirmed' | 'completed' | 'cancelled'

export type ExpenseStatus = 'pending' | 'approved' | 'rejected'

export type MovementType = 'in' | 'out' | 'adjustment'

export type Resource = 'dashboard' | 'customers' | 'sales' | 'expenses' | 'inventory' | 'reports' | 'users' | 'settings'

export interface Tenant {
  id: string
  name: string
  slug: string
  business_type: BusinessType
  logo_url?: string
  currency: string
  timezone: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  tenant_id: string
  full_name: string
  email: string
  role: UserRole
  avatar_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  tenant_id: string
  name: string
  email?: string
  phone?: string
  address?: string
  notes?: string
  type: 'individual' | 'company'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  tenant_id: string
  name: string
  description?: string
  sku?: string
  category?: string
  unit: string
  price: number
  cost: number
  quantity: number
  min_quantity: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SalesOrder {
  id: string
  tenant_id: string
  customer_id?: string
  order_number: string
  status: OrderStatus
  subtotal: number
  tax: number
  discount: number
  total: number
  notes?: string
  due_date?: string
  created_by?: string
  created_at: string
  updated_at: string
  customer?: Customer
  items?: SalesOrderItem[]
}

export interface SalesOrderItem {
  id: string
  order_id: string
  product_id?: string
  description: string
  quantity: number
  unit_price: number
  discount: number
  total: number
  created_at: string
  product?: Product
}

export interface ExpenseCategory {
  id: string
  tenant_id: string
  name: string
  color: string
  created_at: string
}

export interface Expense {
  id: string
  tenant_id: string
  category_id?: string
  title: string
  amount: number
  date: string
  notes?: string
  receipt_url?: string
  status: ExpenseStatus
  created_by?: string
  created_at: string
  updated_at: string
  category?: ExpenseCategory
}

export interface InventoryMovement {
  id: string
  tenant_id: string
  product_id: string
  type: MovementType
  quantity: number
  reference?: string
  notes?: string
  created_by?: string
  created_at: string
  product?: Product
}

export interface RolePermission {
  id: string
  tenant_id: string
  role: UserRole
  resource: Resource
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
  created_at: string
}

export interface DashboardStats {
  totalRevenue: number
  totalExpenses: number
  totalCustomers: number
  totalOrders: number
  revenueByMonth: { month: string; revenue: number; expenses: number }[]
  topProducts: { name: string; quantity: number; revenue: number }[]
  ordersByStatus: { status: string; count: number }[]
}
