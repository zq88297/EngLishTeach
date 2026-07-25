create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  age_confirmed_at timestamptz not null,
  preferred_case text check (preferred_case in ('court', 'city')),
  accessibility jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_events (
  event_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  case_id text not null check (case_id in ('court', 'city')),
  chapter_id text not null,
  encounter_id text not null,
  content_version text not null,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  result text not null check (
    result in (
      'knowledge_correct',
      'knowledge_incorrect',
      'timeout',
      'input_cancelled',
      'system_interruption'
    )
  ),
  response_ms integer not null check (response_ms >= 0),
  used_hint boolean not null default false,
  answer_normalized text,
  confused_with_item_id text
);

create index if not exists learning_events_user_occurred_idx
  on public.learning_events (user_id, occurred_at desc);

create table if not exists public.story_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id text not null check (case_id in ('court', 'city')),
  content_version text not null,
  state jsonb not null,
  client_updated_at timestamptz not null,
  server_updated_at timestamptz not null default now(),
  primary key (user_id, case_id)
);

alter table public.profiles enable row level security;
alter table public.learning_events enable row level security;
alter table public.story_progress enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "learning_events_select_own"
  on public.learning_events for select
  using (auth.uid() = user_id);

create policy "learning_events_insert_own"
  on public.learning_events for insert
  with check (auth.uid() = user_id);

create policy "story_progress_select_own"
  on public.story_progress for select
  using (auth.uid() = user_id);

create policy "story_progress_insert_own"
  on public.story_progress for insert
  with check (auth.uid() = user_id);

create policy "story_progress_update_own"
  on public.story_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "learning_events_update_own"
  on public.learning_events for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

