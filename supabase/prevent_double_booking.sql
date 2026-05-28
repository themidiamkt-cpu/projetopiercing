create extension if not exists btree_gist;

alter table appointments
  drop constraint if exists appointments_no_time_overlap;

alter table appointments
  add constraint appointments_no_time_overlap
  exclude using gist (
    studio_id with =,
    tstzrange(start_time, end_time, '[)') with &&
  )
  where (status <> 'cancelled');
