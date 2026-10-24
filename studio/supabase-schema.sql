-- GeoNusa: skema Supabase (aman dijalankan ulang di SQL Editor)

-- ===== PROFIL =====
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  is_pro boolean default false,
  created_at timestamptz default timezone('utc', now())
);
alter table public.profiles enable row level security;

drop policy if exists "Profil dapat dibaca oleh pemiliknya" on public.profiles;
create policy "Profil dapat dibaca oleh pemiliknya" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "Profil dapat diperbarui oleh pemiliknya" on public.profiles;
create policy "Profil dapat diperbarui oleh pemiliknya" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- FIX KEAMANAN: pengguna hanya boleh mengubah full_name, bukan is_pro
revoke update on public.profiles from anon, authenticated;
grant update (full_name) on public.profiles to authenticated;

-- View publik tanpa email (untuk menampilkan nama kreator di linimasa)
create or replace view public.public_profiles as
  select id, full_name from public.profiles;
grant select on public.public_profiles to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, is_pro)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
          false)
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ===== LAYER SPASIAL =====
create table if not exists public.spatial_layers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  geojson jsonb not null,
  color text default '#008bb0',
  opacity numeric default 0.7,
  stroke_width numeric default 2,
  is_visible boolean default true,
  storage_file_path text,
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now())
);
-- FIX: kolom yang dipakai aplikasi tapi tidak ada di skema lama
alter table public.spatial_layers add column if not exists is_public boolean default false;
alter table public.spatial_layers add column if not exists allow_download boolean default true;
alter table public.spatial_layers add column if not exists description text;
create index if not exists spatial_layers_public_idx on public.spatial_layers (is_public, created_at desc);

alter table public.spatial_layers enable row level security;
drop policy if exists "Pengguna hanya dapat melihat layernya sendiri" on public.spatial_layers;
drop policy if exists "Layer dapat dilihat pemilik atau jika publik" on public.spatial_layers;
create policy "Layer dapat dilihat pemilik atau jika publik" on public.spatial_layers
  for select using (is_public or auth.uid() = user_id);
drop policy if exists "Pengguna dapat menyisipkan layernya sendiri" on public.spatial_layers;
create policy "Pengguna dapat menyisipkan layernya sendiri" on public.spatial_layers
  for insert with check (auth.uid() = user_id);
drop policy if exists "Pengguna dapat mengubah layernya sendiri" on public.spatial_layers;
create policy "Pengguna dapat mengubah layernya sendiri" on public.spatial_layers
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);  -- FIX: with check
drop policy if exists "Pengguna dapat menghapus layernya sendiri" on public.spatial_layers;
create policy "Pengguna dapat menghapus layernya sendiri" on public.spatial_layers
  for delete using (auth.uid() = user_id);

-- ===== SOSMED: SUKA & KOMENTAR =====
create table if not exists public.likes (
  layer_id uuid references public.spatial_layers on delete cascade,
  user_id uuid references auth.users on delete cascade default auth.uid(),
  created_at timestamptz default now(),
  primary key (layer_id, user_id)
);
alter table public.likes enable row level security;
drop policy if exists "Suka dapat dilihat semua" on public.likes;
create policy "Suka dapat dilihat semua" on public.likes for select using (true);
drop policy if exists "Pengguna dapat menyukai" on public.likes;
create policy "Pengguna dapat menyukai" on public.likes for insert
  with check (auth.uid() = user_id and exists (select 1 from public.spatial_layers s where s.id = layer_id and s.is_public));
drop policy if exists "Pengguna dapat batal suka" on public.likes;
create policy "Pengguna dapat batal suka" on public.likes for delete using (auth.uid() = user_id);

create table if not exists public.comments (
  id uuid default gen_random_uuid() primary key,
  layer_id uuid references public.spatial_layers on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null default auth.uid(),
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz default now()
);
create index if not exists comments_layer_idx on public.comments (layer_id, created_at);
alter table public.comments enable row level security;
drop policy if exists "Komentar dapat dilihat semua" on public.comments;
create policy "Komentar dapat dilihat semua" on public.comments for select using (true);
drop policy if exists "Pengguna dapat berkomentar" on public.comments;
create policy "Pengguna dapat berkomentar" on public.comments for insert
  with check (auth.uid() = user_id and exists (select 1 from public.spatial_layers s where s.id = layer_id and s.is_public));
drop policy if exists "Pengguna dapat menghapus komentarnya" on public.comments;
create policy "Pengguna dapat menghapus komentarnya" on public.comments for delete using (auth.uid() = user_id);
