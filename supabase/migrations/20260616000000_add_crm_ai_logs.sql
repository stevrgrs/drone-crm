create table if not exists public.crm_search_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  question text,
  answer text,
  ai_plan jsonb,
  structured_plan jsonb,
  customer_matches jsonb,
  job_matches jsonb,
  returned_cards jsonb,
  errors jsonb
);

create table if not exists public.crm_intake_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  raw_input text,
  parsed_result jsonb,
  saved_customer_id uuid,
  saved_job_id uuid,
  confirmed boolean not null default false,
  errors jsonb
);
