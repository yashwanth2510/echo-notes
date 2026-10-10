-- Echo Notes: per-user notes storage
-- Run this once in the Supabase SQL editor.

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Voice note',
  text text not null default '',
  mode text not null default 'mom',
  language text not null default 'auto',
  created_at timestamptz not null default now()
);

alter table public.notes enable row level security;

create policy "users can view own notes"
  on public.notes for select
  using (auth.uid() = user_id);

create policy "users can create own notes"
  on public.notes for insert
  with check (auth.uid() = user_id);

create policy "users can update own notes"
  on public.notes for update
  using (auth.uid() = user_id);

create policy "users can delete own notes"
  on public.notes for delete
  using (auth.uid() = user_id);

create index if not exists notes_user_idx on public.notes (user_id, created_at desc);