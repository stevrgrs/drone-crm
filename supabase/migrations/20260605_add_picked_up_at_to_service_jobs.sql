alter table public.service_jobs
add column if not exists picked_up_at timestamptz;
