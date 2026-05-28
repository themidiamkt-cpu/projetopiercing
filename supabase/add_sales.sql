create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  sale_date date not null default current_date,
  amount numeric(12, 2) not null check (amount >= 0),
  description text,
  payment_method text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sales_studio_date on sales(studio_id, sale_date);
create index if not exists idx_sales_customer on sales(customer_id);

drop trigger if exists trg_sales_updated_at on sales;
create trigger trg_sales_updated_at before update on sales
for each row execute function touch_updated_at();

alter table sales enable row level security;

drop policy if exists "sales tenant access" on sales;
create policy "sales tenant access" on sales
for all using (is_platform_admin() or is_studio_member(studio_id))
with check (is_platform_admin() or is_studio_member(studio_id));
