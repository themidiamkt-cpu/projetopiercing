create table if not exists growth_plan_assessments (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade unique,
  instagram_status text not null default 'partial' check (instagram_status in ('yes', 'partial', 'no')),
  google_status text not null default 'partial' check (google_status in ('yes', 'partial', 'no')),
  atendimento_status text not null default 'partial' check (atendimento_status in ('yes', 'partial', 'no')),
  crm_status text not null default 'partial' check (crm_status in ('yes', 'partial', 'no')),
  conteudo_status text not null default 'partial' check (conteudo_status in ('yes', 'partial', 'no')),
  conversao_status text not null default 'partial' check (conversao_status in ('yes', 'partial', 'no')),
  notes text,
  updated_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table growth_plan_assessments enable row level security;

drop policy if exists "growth plan assessments tenant access" on growth_plan_assessments;
create policy "growth plan assessments tenant access" on growth_plan_assessments
for all using (is_platform_admin() or is_studio_member(studio_id))
with check (is_platform_admin() or is_studio_member(studio_id));

create index if not exists idx_growth_plan_assessments_studio on growth_plan_assessments(studio_id);
