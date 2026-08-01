-- Progress storage. Test *content* lives in git, never here.
--
-- One row per (user, test). Answers are stored as a single jsonb blob rather
-- than one row per answer: task types will keep evolving as new exam formats
-- are added, and a rigid answers table would need a migration every time.

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  test_id text not null,
  answers jsonb not null default '{}'::jsonb,
  self_assessment jsonb not null default '{}'::jsonb,
  submitted_sections text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, test_id)
);

create index if not exists attempts_user_id_idx on public.attempts (user_id);

alter table public.attempts enable row level security;

drop policy if exists "own attempts: select" on public.attempts;
create policy "own attempts: select" on public.attempts
  for select using (auth.uid() = user_id);

drop policy if exists "own attempts: insert" on public.attempts;
create policy "own attempts: insert" on public.attempts
  for insert with check (auth.uid() = user_id);

drop policy if exists "own attempts: update" on public.attempts;
create policy "own attempts: update" on public.attempts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own attempts: delete" on public.attempts;
create policy "own attempts: delete" on public.attempts
  for delete using (auth.uid() = user_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists attempts_touch_updated_at on public.attempts;
create trigger attempts_touch_updated_at
  before update on public.attempts
  for each row execute function public.touch_updated_at();
