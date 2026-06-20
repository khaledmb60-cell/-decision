-- ============================================================
-- GrowCore ERP - Initial Database Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TENANTS (Organizations)
-- ============================================================
CREATE TABLE public.tenants (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  business_type TEXT NOT NULL CHECK (business_type IN ('nursery','construction','car_wash','laundry','logistics')),
  logo_url    TEXT,
  currency    TEXT NOT NULL DEFAULT 'USD',
  timezone    TEXT NOT NULL DEFAULT 'UTC',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id   UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('owner','ceo','manager','accountant','sales','operations')),
  avatar_url  TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE public.customers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT,
  phone       TEXT,
  address     TEXT,
  notes       TEXT,
  type        TEXT NOT NULL DEFAULT 'individual' CHECK (type IN ('individual','company')),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PRODUCTS / INVENTORY
-- ============================================================
CREATE TABLE public.products (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  sku           TEXT,
  category      TEXT,
  unit          TEXT NOT NULL DEFAULT 'unit',
  price         NUMERIC(12,2) NOT NULL DEFAULT 0,
  cost          NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantity      NUMERIC(12,2) NOT NULL DEFAULT 0,
  min_quantity  NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SALES ORDERS
-- ============================================================
CREATE TABLE public.sales_orders (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id   UUID REFERENCES public.customers(id),
  order_number  TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending','confirmed','completed','cancelled')),
  subtotal      NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax           NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  total         NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes         TEXT,
  due_date      DATE,
  created_by    UUID REFERENCES public.profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SALES ORDER ITEMS
-- ============================================================
CREATE TABLE public.sales_order_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES public.products(id),
  description     TEXT NOT NULL,
  quantity        NUMERIC(12,2) NOT NULL DEFAULT 1,
  unit_price      NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  total           NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EXPENSE CATEGORIES
-- ============================================================
CREATE TABLE public.expense_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#6B7280',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EXPENSES
-- ============================================================
CREATE TABLE public.expenses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category_id   UUID REFERENCES public.expense_categories(id),
  title         TEXT NOT NULL,
  amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  notes         TEXT,
  receipt_url   TEXT,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_by    UUID REFERENCES public.profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INVENTORY MOVEMENTS
-- ============================================================
CREATE TABLE public.inventory_movements (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('in','out','adjustment')),
  quantity    NUMERIC(12,2) NOT NULL,
  reference   TEXT,
  notes       TEXT,
  created_by  UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ROLE PERMISSIONS
-- ============================================================
CREATE TABLE public.role_permissions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role        TEXT NOT NULL,
  resource    TEXT NOT NULL,
  can_view    BOOLEAN NOT NULL DEFAULT FALSE,
  can_create  BOOLEAN NOT NULL DEFAULT FALSE,
  can_edit    BOOLEAN NOT NULL DEFAULT FALSE,
  can_delete  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, role, resource)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's tenant
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS UUID LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- Tenants: members see their own tenant
CREATE POLICY "tenant_select" ON public.tenants FOR SELECT
  USING (id = public.get_my_tenant_id());
CREATE POLICY "tenant_update" ON public.tenants FOR UPDATE
  USING (id = public.get_my_tenant_id() AND public.get_my_role() IN ('owner','ceo'));

-- Profiles: tenant members
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT
  USING (tenant_id = public.get_my_tenant_id());
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT
  WITH CHECK (public.get_my_role() IN ('owner','ceo','manager'));
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE
  USING (tenant_id = public.get_my_tenant_id() AND public.get_my_role() IN ('owner','ceo','manager'));
CREATE POLICY "profiles_delete" ON public.profiles FOR DELETE
  USING (tenant_id = public.get_my_tenant_id() AND public.get_my_role() IN ('owner','ceo'));

-- Customers
CREATE POLICY "customers_all" ON public.customers FOR ALL
  USING (tenant_id = public.get_my_tenant_id());

-- Products
CREATE POLICY "products_all" ON public.products FOR ALL
  USING (tenant_id = public.get_my_tenant_id());

-- Sales orders
CREATE POLICY "sales_orders_all" ON public.sales_orders FOR ALL
  USING (tenant_id = public.get_my_tenant_id());

-- Sales order items
CREATE POLICY "sales_order_items_all" ON public.sales_order_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.sales_orders so WHERE so.id = order_id AND so.tenant_id = public.get_my_tenant_id()));

-- Expense categories
CREATE POLICY "expense_categories_all" ON public.expense_categories FOR ALL
  USING (tenant_id = public.get_my_tenant_id());

-- Expenses
CREATE POLICY "expenses_all" ON public.expenses FOR ALL
  USING (tenant_id = public.get_my_tenant_id());

-- Inventory movements
CREATE POLICY "inventory_movements_all" ON public.inventory_movements FOR ALL
  USING (tenant_id = public.get_my_tenant_id());

-- Role permissions
CREATE POLICY "role_permissions_all" ON public.role_permissions FOR ALL
  USING (tenant_id = public.get_my_tenant_id());

-- ============================================================
-- TRIGGERS - updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_sales_orders_updated_at BEFORE UPDATE ON public.sales_orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- SEED: Default role permissions for new tenants
-- ============================================================
CREATE OR REPLACE FUNCTION public.seed_default_permissions(p_tenant_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  resources TEXT[] := ARRAY['dashboard','customers','sales','expenses','inventory','reports','users','settings'];
  r TEXT;
BEGIN
  FOREACH r IN ARRAY resources LOOP
    -- Owner: full access
    INSERT INTO public.role_permissions (tenant_id, role, resource, can_view, can_create, can_edit, can_delete)
      VALUES (p_tenant_id, 'owner', r, TRUE, TRUE, TRUE, TRUE) ON CONFLICT DO NOTHING;
    -- CEO: full access
    INSERT INTO public.role_permissions (tenant_id, role, resource, can_view, can_create, can_edit, can_delete)
      VALUES (p_tenant_id, 'ceo', r, TRUE, TRUE, TRUE, TRUE) ON CONFLICT DO NOTHING;
    -- Manager: no delete on users/settings
    INSERT INTO public.role_permissions (tenant_id, role, resource, can_view, can_create, can_edit, can_delete)
      VALUES (p_tenant_id, 'manager', r, TRUE, TRUE, TRUE, r NOT IN ('users','settings')) ON CONFLICT DO NOTHING;
    -- Accountant: view + create on financial, no users/settings
    INSERT INTO public.role_permissions (tenant_id, role, resource, can_view, can_create, can_edit, can_delete)
      VALUES (p_tenant_id, 'accountant', r,
        r NOT IN ('users','settings'),
        r IN ('expenses','sales'),
        r IN ('expenses','sales'),
        FALSE) ON CONFLICT DO NOTHING;
    -- Sales: customers + sales
    INSERT INTO public.role_permissions (tenant_id, role, resource, can_view, can_create, can_edit, can_delete)
      VALUES (p_tenant_id, 'sales', r,
        r IN ('dashboard','customers','sales','inventory'),
        r IN ('customers','sales'),
        r IN ('customers','sales'),
        FALSE) ON CONFLICT DO NOTHING;
    -- Operations: inventory
    INSERT INTO public.role_permissions (tenant_id, role, resource, can_view, can_create, can_edit, can_delete)
      VALUES (p_tenant_id, 'operations', r,
        r IN ('dashboard','inventory','customers'),
        r IN ('inventory'),
        r IN ('inventory'),
        FALSE) ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_profiles_tenant ON public.profiles(tenant_id);
CREATE INDEX idx_customers_tenant ON public.customers(tenant_id);
CREATE INDEX idx_products_tenant ON public.products(tenant_id);
CREATE INDEX idx_sales_orders_tenant ON public.sales_orders(tenant_id);
CREATE INDEX idx_sales_orders_customer ON public.sales_orders(customer_id);
CREATE INDEX idx_expenses_tenant ON public.expenses(tenant_id);
CREATE INDEX idx_expenses_date ON public.expenses(date);
CREATE INDEX idx_inventory_movements_product ON public.inventory_movements(product_id);
