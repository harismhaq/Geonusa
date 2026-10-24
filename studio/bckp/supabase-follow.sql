-- GeoNusa: follow / following (jalankan setelah file SQL sebelumnya; aman diulang)
create table if not exists public.follows (
  follower_id uuid not null references auth.users on delete cascade default auth.uid(),
  following_id uuid not null references auth.users on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index if not exists follows_following_idx on public.follows (following_id);
alter table public.follows enable row level security;
drop policy if exists "Follow dapat dilihat semua" on public.follows;
create policy "Follow dapat dilihat semua" on public.follows for select using (true);
drop policy if exists "Pengguna dapat mengikuti" on public.follows;
create policy "Pengguna dapat mengikuti" on public.follows for insert with check (auth.uid() = follower_id);
drop policy if exists "Pengguna dapat berhenti mengikuti" on public.follows;
create policy "Pengguna dapat berhenti mengikuti" on public.follows for delete using (auth.uid() = follower_id);
notify pgrst, 'reload schema';
