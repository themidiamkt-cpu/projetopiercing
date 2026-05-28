-- MVP final hardening for Estudio lucrativo.
-- Run this after the base schema/setup files.

create extension if not exists btree_gist;
create extension if not exists pg_cron;

alter table studios
  add column if not exists growth_plan_start_date date;

update studios
set growth_plan_start_date = coalesce(growth_plan_start_date, created_at::date, current_date)
where growth_plan_start_date is null;

alter table studios
  alter column growth_plan_start_date set default current_date;

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

alter table appointments
  drop constraint if exists appointments_no_time_overlap;

alter table appointments
  add constraint appointments_no_time_overlap
  exclude using gist (
    studio_id with =,
    tstzrange(start_time, end_time, '[)') with &&
  )
  where (status <> 'cancelled');

create or replace function update_customer_after_appointment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.customer_id is not null then
    update customers
    set
      next_visit_at = case
        when new.status in ('scheduled', 'confirmed') then new.start_time
        when new.status in ('completed', 'cancelled', 'no_show') and next_visit_at = new.start_time then null
        else next_visit_at
      end,
      last_visit_at = case when new.status = 'completed' then new.start_time else last_visit_at end,
      first_visit_at = case
        when new.status = 'completed' and first_visit_at is null then new.start_time
        else first_visit_at
      end,
      appointment_count = (
        select count(*)
        from appointments
        where customer_id = new.customer_id
          and status <> 'cancelled'
      ),
      lifetime_value = coalesce((
        select sum(amount)
        from sales
        where customer_id = new.customer_id
      ), 0),
      updated_at = now()
    where id = new.customer_id;
  end if;

  if new.customer_id is not null
    and new.status = 'completed'
    and (tg_op = 'INSERT' or old.status is distinct from new.status)
  then
    insert into tasks (studio_id, customer_id, appointment_id, title, description, due_at, type)
    select
      new.studio_id,
      new.customer_id,
      new.id,
      'Retorno de 7 dias',
      'Conferir cicatrizacao, orientar cuidados e registrar relacionamento.',
      new.start_time + interval '7 days',
      'return_7_days'
    where not exists (
      select 1
      from tasks
      where appointment_id = new.id
        and type = 'return_7_days'
    );

    insert into leads (
      studio_id,
      customer_id,
      name,
      phone,
      instagram,
      source,
      initial_message,
      current_stage,
      last_interaction_at,
      next_follow_up_at,
      status,
      notes
    )
    select
      c.studio_id,
      c.id,
      c.name,
      c.phone,
      c.instagram,
      'Retorno 7 dias',
      'Retorno de 7 dias - ' || coalesce(new.procedure, new.title),
      'return_7_days',
      now(),
      new.start_time + interval '7 days',
      'open',
      c.notes
    from customers c
    where c.id = new.customer_id
      and not exists (
        select 1
        from leads l
        where l.studio_id = c.studio_id
          and l.customer_id = c.id
          and l.current_stage = 'return_7_days'
          and l.status <> 'archived'
      );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_update_customer_after_appointment on appointments;
create trigger trg_update_customer_after_appointment
after insert or update of customer_id, start_time, status on appointments
for each row execute function update_customer_after_appointment();

create or replace function sync_inactive_30_day_cards()
returns void
language sql
security definer
set search_path = public
as $$
  insert into tasks (studio_id, customer_id, title, description, due_at, type)
  select
    c.studio_id,
    c.id,
    'Cliente 30 dias sem vir',
    'Criar contato de reativacao e registrar proximo passo.',
    now(),
    'inactive_30_days'
  from customers c
  where c.status = 'active'
    and c.last_visit_at < now() - interval '30 days'
    and not exists (
      select 1
      from appointments a
      where a.customer_id = c.id
        and a.start_time > c.last_visit_at
        and a.status in ('scheduled', 'confirmed', 'completed')
    )
    and not exists (
      select 1
      from tasks t
      where t.customer_id = c.id
        and t.type = 'inactive_30_days'
        and t.status <> 'cancelled'
    );

  insert into leads (
    studio_id,
    customer_id,
    name,
    phone,
    instagram,
    source,
    initial_message,
    current_stage,
    last_interaction_at,
    status,
    notes
  )
  select
    c.studio_id,
    c.id,
    c.name,
    c.phone,
    c.instagram,
    '30 dias sem vir',
    'Cliente ha 30 dias sem retorno registrado.',
    'inactive_30_days',
    now(),
    'open',
    c.notes
  from customers c
  where c.status = 'active'
    and c.last_visit_at < now() - interval '30 days'
    and not exists (
      select 1
      from appointments a
      where a.customer_id = c.id
        and a.start_time > c.last_visit_at
        and a.status in ('scheduled', 'confirmed', 'completed')
    )
    and not exists (
      select 1
      from leads l
      where l.customer_id = c.id
        and l.current_stage = 'inactive_30_days'
        and l.status <> 'archived'
    );
$$;

create or replace function sync_birthday_month_cards()
returns void
language sql
security definer
set search_path = public
as $$
  insert into tasks (studio_id, customer_id, title, description, due_at, type)
  select
    c.studio_id,
    c.id,
    'Aniversariante do mes',
    'Registrar acao de relacionamento no mes do aniversario.',
    date_trunc('month', now()) + interval '1 month' - interval '1 day',
    'birthday_month'
  from customers c
  where c.birth_date is not null
    and extract(month from c.birth_date) = extract(month from now())
    and not exists (
      select 1
      from tasks t
      where t.customer_id = c.id
        and t.type = 'birthday_month'
        and date_trunc('month', t.created_at) = date_trunc('month', now())
        and t.status <> 'cancelled'
    );

  insert into leads (
    studio_id,
    customer_id,
    name,
    phone,
    instagram,
    source,
    initial_message,
    current_stage,
    last_interaction_at,
    status,
    notes
  )
  select
    c.studio_id,
    c.id,
    c.name,
    c.phone,
    c.instagram,
    'Aniversario',
    'Aniversariante do mes - ' || to_char(c.birth_date, 'DD/MM'),
    'birthday_month',
    now(),
    'open',
    c.notes
  from customers c
  where c.birth_date is not null
    and extract(month from c.birth_date) = extract(month from now())
    and not exists (
      select 1
      from leads l
      where l.customer_id = c.id
        and l.source = 'Aniversario'
        and date_trunc('month', l.created_at) = date_trunc('month', now())
    );
$$;

create or replace function sync_operational_automation_cards()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform sync_inactive_30_day_cards();
  perform sync_birthday_month_cards();
end;
$$;

select cron.unschedule('piercing-operational-automations')
where exists (
  select 1
  from cron.job
  where jobname = 'piercing-operational-automations'
);

select cron.schedule(
  'piercing-operational-automations',
  '15 6 * * *',
  $$select sync_operational_automation_cards();$$
);
