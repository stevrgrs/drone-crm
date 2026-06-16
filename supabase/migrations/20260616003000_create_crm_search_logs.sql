-- Logs natural-language CRM search questions so common patterns can be optimized later.
-- Safe to run more than once.

create table if not exists public.crm_search_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  question text not null,
  answer text,
  ai_plan jsonb,
  structured_plan jsonb,
  customer_matches integer not null default 0,
  job_matches integer not null default 0,
  returned_cards integer not null default 0,
  errors text[] not null default '{}'
);

alter table public.crm_search_logs enable row level security;

-- The app's server-side Supabase client currently uses the anon/publishable key.
-- This policy lets the server-side search flow insert logs without exposing service-role credentials.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'crm_search_logs'
      and policyname = 'Allow CRM search log inserts'
  ) then
    create policy "Allow CRM search log inserts"
      on public.crm_search_logs
      for insert
      to anon, authenticated
      with check (true);
  end if;
end $$;

create index if not exists crm_search_logs_created_at_idx
  on public.crm_search_logs (created_at desc);

create index if not exists crm_search_logs_question_idx
  on public.crm_search_logs using gin (to_tsvector('english', question));
