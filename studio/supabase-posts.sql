-- GeoNusa: tabel POSTS (jalankan SETELAH supabase-schema.sql; aman diulang)
-- Catatan: tabel likes & comments dibuat ulang (kini menunjuk ke posts), data suka/komentar lama terhapus.

create table if not exists public.posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  layer_id uuid not null unique references public.spatial_layers on delete cascade,
  title text not null,
  caption text,
  tags text[] default '{}',
  allow_download boolean default true,
  preview jsonb,                       -- geometri sederhana untuk kartu linimasa
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists posts_created_idx on public.posts (created_at desc);
alter table public.posts enable row level security;
drop policy if exists "Postingan dapat dilihat semua" on public.posts;
create policy "Postingan dapat dilihat semua" on public.posts for select using (true);
drop policy if exists "Pemilik layer dapat memposting" on public.posts;
create policy "Pemilik layer dapat memposting" on public.posts for insert
  with check (auth.uid() = user_id and exists (select 1 from public.spatial_layers s where s.id = layer_id and s.user_id = auth.uid()));
drop policy if exists "Pemilik dapat mengubah postingan" on public.posts;
create policy "Pemilik dapat mengubah postingan" on public.posts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Pemilik dapat menarik postingan" on public.posts;
create policy "Pemilik dapat menarik postingan" on public.posts for delete using (auth.uid() = user_id);

-- Layer bisa dibaca pemiliknya, atau siapa pun jika sudah diposting
drop policy if exists "Layer dapat dilihat pemilik atau jika publik" on public.spatial_layers;
create policy "Layer dapat dilihat pemilik atau jika diposting" on public.spatial_layers for select
  using (auth.uid() = user_id or exists (select 1 from public.posts p where p.layer_id = spatial_layers.id));

-- Pindahkan layer publik lama menjadi postingan
insert into public.posts (user_id, layer_id, title, caption, allow_download, created_at)
select user_id, id, name, description, coalesce(allow_download, true), created_at
from public.spatial_layers s
where is_public and not exists (select 1 from public.posts p where p.layer_id = s.id);

-- Suka & komentar kini per postingan
drop table if exists public.likes, public.comments cascade;
create table public.likes (
  post_id uuid references public.posts on delete cascade,
  user_id uuid references auth.users on delete cascade default auth.uid(),
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);
alter table public.likes enable row level security;
create policy "Suka dapat dilihat semua" on public.likes for select using (true);
create policy "Pengguna dapat menyukai" on public.likes for insert with check (auth.uid() = user_id);
create policy "Pengguna dapat batal suka" on public.likes for delete using (auth.uid() = user_id);

create table public.comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null default auth.uid(),
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz default now()
);
create index comments_post_idx on public.comments (post_id, created_at);
alter table public.comments enable row level security;
create policy "Komentar dapat dilihat semua" on public.comments for select using (true);
create policy "Pengguna dapat berkomentar" on public.comments for insert with check (auth.uid() = user_id);
create policy "Pengguna dapat menghapus komentarnya" on public.comments for delete using (auth.uid() = user_id);

notify pgrst, 'reload schema';
