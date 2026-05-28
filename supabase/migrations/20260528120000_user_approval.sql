alter table profiles
  add column if not exists approval_status text not null default 'approved',
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references profiles(id) on delete set null,
  add column if not exists denied_at timestamptz,
  add column if not exists denied_by uuid references profiles(id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_approval_status_check'
      and conrelid = 'profiles'::regclass
  ) then
    alter table profiles
      add constraint profiles_approval_status_check
      check (approval_status in ('pending', 'approved', 'denied'));
  end if;
end $$;

update profiles
set approval_status = 'approved'
where approval_status is null;

create index if not exists idx_profiles_approval_status on profiles(approval_status);
