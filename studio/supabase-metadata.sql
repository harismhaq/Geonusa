-- GeoNusa: metadata peta, bookmark, bio profil
-- Jalankan SETELAH supabase-schema.sql dan supabase-posts.sql (aman diulang).

-- 1) Kolom yang sudah dipakai studio.html tetapi belum ada di skema + metadata baru
alter table public.posts add column if not exists preview_attr text;
alter table public.posts add column if not exists preview_colormap jsonb default '{}'::jsonb;
alter table public.posts add column if not exists category text;
alter table public.posts add column if not exists region text;
alter table public.posts add column if not exists data_year int;
alter table public.posts add column if not exists source text;
alter table public.posts add column if not exists crs text;
alter table public.posts add column if not exists data_format text;

-- 2) Bio profil (pengguna hanya boleh mengubah full_name & bio, bukan is_pro)
alter table public.profiles add column if not exists bio text;
revoke update on public.profiles from anon, authenticated;
grant update (full_name, bio) on public.profiles to authenticated;
drop view if exists public.public_profiles;
create view public.public_profiles as select id, full_name, bio from public.profiles;  -- tanpa email
grant select on public.public_profiles to anon, authenticated;

-- 3) Bookmark / Peta Tersimpan (privat: hanya pemilik yang bisa melihat)
create table if not exists public.bookmarks (
  post_id uuid references public.posts on delete cascade,
  user_id uuid references auth.users on delete cascade default auth.uid(),
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);
alter table public.bookmarks enable row level security;
drop policy if exists "Bookmark dilihat pemiliknya" on public.bookmarks;
create policy "Bookmark dilihat pemiliknya" on public.bookmarks for select using (auth.uid() = user_id);
drop policy if exists "Pengguna dapat menyimpan" on public.bookmarks;
create policy "Pengguna dapat menyimpan" on public.bookmarks for insert with check (auth.uid() = user_id);
drop policy if exists "Pengguna dapat membatalkan simpan" on public.bookmarks;
create policy "Pengguna dapat membatalkan simpan" on public.bookmarks for delete using (auth.uid() = user_id);

notify pgrst, 'reload schema';
