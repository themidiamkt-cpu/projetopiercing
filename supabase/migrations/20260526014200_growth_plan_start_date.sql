alter table studios
  add column if not exists growth_plan_start_date date;

update studios
set growth_plan_start_date = coalesce(growth_plan_start_date, created_at::date, current_date)
where growth_plan_start_date is null;

alter table studios
  alter column growth_plan_start_date set default current_date;
