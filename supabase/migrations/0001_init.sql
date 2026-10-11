-- Winner Apparels – initial schema (Supabase / PostgreSQL 15+)
-- Business collections: id + a few indexed columns + the full document as jsonb.

create table if not exists products        (id text primary key, name text, sku text, category text, status text, data jsonb not null, updated_at timestamptz not null default now());
create table if not exists materials       (id text primary key, name text, sku text, warehouse text, data jsonb not null, updated_at timestamptz not null default now());
create table if not exists warehouses      (id text primary key, code text, data jsonb not null, updated_at timestamptz not null default now());
create table if not exists movements       (id text primary key, sku text, type text, mv_date text, data jsonb not null, updated_at timestamptz not null default now());
create table if not exists suppliers       (id text primary key, name text, status text, data jsonb not null, updated_at timestamptz not null default now());
create table if not exists requirements    (id text primary key, material_id text, status text, data jsonb not null, updated_at timestamptz not null default now());
create table if not exists purchase_orders (id text primary key, supplier_id text, status text, data jsonb not null, updated_at timestamptz not null default now());
create table if not exists plans           (id text primary key, product_id text, status text, stage text, data jsonb not null, updated_at timestamptz not null default now());
create table if not exists employees       (id text primary key, name text, dept text, status text, data jsonb not null, updated_at timestamptz not null default now());
create table if not exists attendance      (id text primary key, emp_id text, att_date text, status text, data jsonb not null, updated_at timestamptz not null default now());
create table if not exists leaves          (id text primary key, emp_id text, status text, data jsonb not null, updated_at timestamptz not null default now());
create table if not exists buyers          (id text primary key, name text, country text, data jsonb not null, updated_at timestamptz not null default now());
create table if not exists countries       (id text primary key, name text, data jsonb not null, updated_at timestamptz not null default now());
create table if not exists orders          (id text primary key, buyer text, country text, step integer, ship_date text, data jsonb not null, updated_at timestamptz not null default now());
create table if not exists activities      (id text primary key, data jsonb not null, updated_at timestamptz not null default now());
create table if not exists bom             (id text primary key, data jsonb not null, updated_at timestamptz not null default now());

-- Settings, ordering of lists, revision counter
create table if not exists kv              (key text primary key, data jsonb not null);
create table if not exists collection_order(name text primary key, ids jsonb not null);
create table if not exists meta            (key text primary key, n bigint not null);

-- Website inquiries and administrators
create table if not exists inquiries (
  id bigserial primary key,
  name text not null,
  email text not null,
  company text,
  country text,
  interest text,
  quantity integer,
  message text not null,
  status text not null default 'new',
  ip_hash text,
  created_at timestamptz not null default now()
);
create table if not exists users (
  id bigserial primary key,
  email text not null unique,
  name text not null,
  role text not null default 'admin',
  password_hash text not null,
  created_at timestamptz not null default now()
);

-- Indexes: every filter/sort column used by the API and the ERP lists
create index if not exists idx_products_status        on products (status);
create index if not exists idx_products_category      on products (category);
create index if not exists idx_products_sku           on products (sku);
create index if not exists idx_materials_sku          on materials (sku);
create index if not exists idx_materials_warehouse    on materials (warehouse);
create index if not exists idx_movements_sku          on movements (sku);
create index if not exists idx_movements_date         on movements (mv_date);
create index if not exists idx_requirements_material  on requirements (material_id);
create index if not exists idx_requirements_status    on requirements (status);
create index if not exists idx_po_supplier            on purchase_orders (supplier_id);
create index if not exists idx_po_status              on purchase_orders (status);
create index if not exists idx_plans_product          on plans (product_id);
create index if not exists idx_plans_status           on plans (status);
create index if not exists idx_employees_dept         on employees (dept);
create index if not exists idx_attendance_emp_date    on attendance (emp_id, att_date);
create index if not exists idx_attendance_date        on attendance (att_date);
create index if not exists idx_leaves_emp             on leaves (emp_id);
create index if not exists idx_leaves_status          on leaves (status);
create index if not exists idx_buyers_country         on buyers (country);
create index if not exists idx_orders_buyer           on orders (buyer);
create index if not exists idx_orders_country         on orders (country);
create index if not exists idx_orders_step            on orders (step);
create index if not exists idx_orders_ship_date       on orders (ship_date);
create index if not exists idx_inquiries_status_date  on inquiries (status, created_at);
create index if not exists idx_inquiries_email        on inquiries (email);

insert into meta (key, n) values ('rev', 1) on conflict (key) do nothing;
