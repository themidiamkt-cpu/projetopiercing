create extension if not exists "pgcrypto";

do $$ begin
  create type user_role as enum ('platform_admin', 'studio_owner', 'studio_staff');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lead_stage as enum (
    'new',
    'no_response',
    'follow_up_1',
    'follow_up_2',
    'customer',
    'return_7_days',
    'inactive_30_days',
    'birthday_month'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type channel_type as enum ('whatsapp', 'instagram', 'site', 'form', 'manual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type appointment_status as enum ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_status as enum ('pending', 'in_progress', 'done', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type checklist_status as enum ('pending', 'in_progress', 'done');
exception when duplicate_object then null; end $$;

create table if not exists studios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'trial',
  inbound_api_key text not null default encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role user_role not null default 'studio_staff',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists studio_members (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role user_role not null default 'studio_staff',
  created_at timestamptz not null default now(),
  unique (studio_id, user_id)
);

create table if not exists crm_stages (
  id lead_stage primary key,
  label text not null,
  position int not null,
  description text,
  is_system boolean not null default true
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  name text not null,
  phone text,
  instagram text,
  email text,
  birth_date date,
  registered_at timestamptz not null default now(),
  first_visit_at timestamptz,
  last_visit_at timestamptz,
  next_visit_at timestamptz,
  source text,
  tags text[] not null default '{}',
  notes text,
  status text not null default 'active',
  appointment_count int not null default 0,
  lifetime_value numeric(12, 2),
  consent_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (studio_id, phone)
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  name text not null,
  phone text,
  instagram text,
  source text,
  initial_message text,
  current_stage lead_stage not null default 'new',
  owner_id uuid references profiles(id) on delete set null,
  last_interaction_at timestamptz,
  next_follow_up_at timestamptz,
  status text not null default 'open',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists lead_stage_history (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  from_stage lead_stage,
  to_stage lead_stage not null,
  changed_by uuid references profiles(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists inbound_messages (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  customer_id uuid references customers(id) on delete set null,
  name text not null,
  phone text,
  instagram text,
  message text not null,
  source text,
  channel channel_type not null,
  external_timestamp timestamptz,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  lead_id uuid references leads(id) on delete set null,
  title text not null,
  procedure text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status appointment_status not null default 'scheduled',
  professional_id uuid references profiles(id) on delete set null,
  notes text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  lead_id uuid references leads(id) on delete cascade,
  customer_id uuid references customers(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete cascade,
  title text not null,
  description text,
  due_at timestamptz,
  status task_status not null default 'pending',
  type text not null default 'manual',
  assigned_to uuid references profiles(id) on delete set null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  lead_id uuid references leads(id) on delete cascade,
  customer_id uuid references customers(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete cascade,
  body text not null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists checklist_templates (
  id uuid primary key default gen_random_uuid(),
  month_number int not null check (month_number between 1 and 3),
  suggested_week int not null check (suggested_week between 1 and 4),
  title text not null,
  description text,
  category text not null,
  points int not null check (points in (5, 10, 20)),
  is_global boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists checklist_items (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  template_id uuid references checklist_templates(id) on delete set null,
  month_number int not null check (month_number between 1 and 3),
  suggested_week int not null check (suggested_week between 1 and 4),
  title text not null,
  description text,
  category text not null,
  points int not null check (points in (5, 10, 20)),
  created_at timestamptz not null default now()
);

create table if not exists studio_checklist_progress (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  checklist_item_id uuid not null references checklist_items(id) on delete cascade,
  status checklist_status not null default 'pending',
  completed_at timestamptz,
  evidence_url text,
  evidence_text text,
  notes text,
  updated_by uuid references profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (studio_id, checklist_item_id)
);

create table if not exists execution_scores (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  month_number int not null check (month_number between 1 and 3),
  week_number int check (week_number between 1 and 5),
  category text,
  total_points int not null default 0,
  completed_points int not null default 0,
  percent numeric(5, 2) generated always as (
    case when total_points = 0 then 0 else round((completed_points::numeric / total_points::numeric) * 100, 2) end
  ) stored,
  calculated_at timestamptz not null default now()
);

create table if not exists agency_interest (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  message text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create index if not exists idx_studio_members_user on studio_members(user_id);
create index if not exists idx_leads_studio on leads(studio_id);
create index if not exists idx_leads_phone on leads(studio_id, phone);
create index if not exists idx_leads_stage on leads(studio_id, current_stage);
create index if not exists idx_customers_studio on customers(studio_id);
create index if not exists idx_customers_phone on customers(studio_id, phone);
create index if not exists idx_customers_birth_date on customers(studio_id, birth_date);
create index if not exists idx_appointments_studio_start on appointments(studio_id, start_time);
create index if not exists idx_tasks_studio_due on tasks(studio_id, due_at);
create index if not exists idx_inbound_messages_studio on inbound_messages(studio_id, created_at);

create or replace function is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and role = 'platform_admin'
  );
$$;

create or replace function is_studio_member(target_studio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from studio_members
    where studio_id = target_studio_id
      and user_id = auth.uid()
  );
$$;

create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function log_lead_stage_change()
returns trigger
language plpgsql
as $$
begin
  if old.current_stage is distinct from new.current_stage then
    insert into lead_stage_history (studio_id, lead_id, from_stage, to_stage, changed_by)
    values (new.studio_id, new.id, old.current_stage, new.current_stage, auth.uid());
  end if;
  return new;
end;
$$;

create or replace function update_customer_after_appointment()
returns trigger
language plpgsql
as $$
begin
  if new.customer_id is not null then
    update customers
    set
      next_visit_at = case when new.status in ('scheduled', 'confirmed') then new.start_time else next_visit_at end,
      last_visit_at = case when new.status = 'completed' then new.start_time else last_visit_at end,
      first_visit_at = case when new.status = 'completed' and first_visit_at is null then new.start_time else first_visit_at end,
      appointment_count = (
        select count(*) from appointments
        where customer_id = new.customer_id and status <> 'cancelled'
      ),
      updated_at = now()
    where id = new.customer_id;
  end if;

  if new.status = 'completed' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    insert into tasks (studio_id, customer_id, appointment_id, title, description, due_at, type)
    values (
      new.studio_id,
      new.customer_id,
      new.id,
      'Retorno de 7 dias',
      'Conferir cicatrizacao, orientar cuidados e estimular relacionamento.',
      new.start_time + interval '7 days',
      'return_7_days'
    )
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_leads_updated_at on leads;
create trigger trg_leads_updated_at before update on leads
for each row execute function touch_updated_at();

drop trigger if exists trg_lead_stage_history on leads;
create trigger trg_lead_stage_history after update of current_stage on leads
for each row execute function log_lead_stage_change();

drop trigger if exists trg_appointments_customer_rollup on appointments;
create trigger trg_appointments_customer_rollup after insert or update on appointments
for each row execute function update_customer_after_appointment();

create or replace function create_inactive_30_day_tasks()
returns void
language sql
security definer
set search_path = public
as $$
  insert into tasks (studio_id, customer_id, title, description, due_at, type)
  select c.studio_id, c.id, 'Cliente 30 dias sem vir', 'Criar contato de reativacao.', now(), 'inactive_30_days'
  from customers c
  where c.last_visit_at < now() - interval '30 days'
    and not exists (
      select 1 from appointments a
      where a.customer_id = c.id
        and a.start_time > c.last_visit_at
        and a.status in ('scheduled', 'confirmed', 'completed')
    )
    and not exists (
      select 1 from tasks t
      where t.customer_id = c.id
        and t.type = 'inactive_30_days'
        and t.status <> 'cancelled'
    );
$$;

create or replace function create_birthday_month_tasks()
returns void
language sql
security definer
set search_path = public
as $$
  insert into tasks (studio_id, customer_id, title, description, due_at, type)
  select c.studio_id, c.id, 'Aniversariante do mes', 'Registrar acao de relacionamento.', date_trunc('month', now()) + interval '1 month' - interval '1 day', 'birthday_month'
  from customers c
  where extract(month from c.birth_date) = extract(month from now())
    and not exists (
      select 1 from tasks t
      where t.customer_id = c.id
        and t.type = 'birthday_month'
        and date_trunc('month', t.created_at) = date_trunc('month', now())
    );
$$;

alter table studios enable row level security;
alter table profiles enable row level security;
alter table studio_members enable row level security;
alter table crm_stages enable row level security;
alter table customers enable row level security;
alter table leads enable row level security;
alter table lead_stage_history enable row level security;
alter table inbound_messages enable row level security;
alter table appointments enable row level security;
alter table tasks enable row level security;
alter table notes enable row level security;
alter table checklist_templates enable row level security;
alter table checklist_items enable row level security;
alter table studio_checklist_progress enable row level security;
alter table execution_scores enable row level security;
alter table agency_interest enable row level security;

create policy "profiles self or platform admin" on profiles
for all using (id = auth.uid() or is_platform_admin())
with check (id = auth.uid() or is_platform_admin());

create policy "studios visible to members" on studios
for select using (is_platform_admin() or is_studio_member(id));

create policy "studios manageable by platform admin" on studios
for all using (is_platform_admin()) with check (is_platform_admin());

create policy "members visible by studio" on studio_members
for select using (is_platform_admin() or is_studio_member(studio_id));

create policy "members manageable by owner or admin" on studio_members
for all using (
  is_platform_admin() or exists (
    select 1 from studio_members sm
    where sm.studio_id = studio_members.studio_id
      and sm.user_id = auth.uid()
      and sm.role = 'studio_owner'
  )
) with check (
  is_platform_admin() or exists (
    select 1 from studio_members sm
    where sm.studio_id = studio_members.studio_id
      and sm.user_id = auth.uid()
      and sm.role = 'studio_owner'
  )
);

create policy "crm stages readable" on crm_stages for select using (true);
create policy "checklist templates readable" on checklist_templates for select using (true);
create policy "checklist templates admin write" on checklist_templates
for all using (is_platform_admin()) with check (is_platform_admin());

create policy "customers tenant access" on customers
for all using (is_platform_admin() or is_studio_member(studio_id))
with check (is_platform_admin() or is_studio_member(studio_id));

create policy "leads tenant access" on leads
for all using (is_platform_admin() or is_studio_member(studio_id))
with check (is_platform_admin() or is_studio_member(studio_id));

create policy "lead history tenant access" on lead_stage_history
for all using (is_platform_admin() or is_studio_member(studio_id))
with check (is_platform_admin() or is_studio_member(studio_id));

create policy "inbound messages tenant access" on inbound_messages
for all using (is_platform_admin() or is_studio_member(studio_id))
with check (is_platform_admin() or is_studio_member(studio_id));

create policy "appointments tenant access" on appointments
for all using (is_platform_admin() or is_studio_member(studio_id))
with check (is_platform_admin() or is_studio_member(studio_id));

create policy "tasks tenant access" on tasks
for all using (is_platform_admin() or is_studio_member(studio_id))
with check (is_platform_admin() or is_studio_member(studio_id));

create policy "notes tenant access" on notes
for all using (is_platform_admin() or is_studio_member(studio_id))
with check (is_platform_admin() or is_studio_member(studio_id));

create policy "checklist items tenant access" on checklist_items
for all using (is_platform_admin() or is_studio_member(studio_id))
with check (is_platform_admin() or is_studio_member(studio_id));

create policy "checklist progress tenant access" on studio_checklist_progress
for all using (is_platform_admin() or is_studio_member(studio_id))
with check (is_platform_admin() or is_studio_member(studio_id));

create policy "execution scores tenant access" on execution_scores
for all using (is_platform_admin() or is_studio_member(studio_id))
with check (is_platform_admin() or is_studio_member(studio_id));

create policy "agency interest tenant access" on agency_interest
for all using (is_platform_admin() or is_studio_member(studio_id))
with check (is_platform_admin() or is_studio_member(studio_id));
