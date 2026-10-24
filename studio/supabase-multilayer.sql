-- GeoNusa: 1 postingan = banyak layer (overlay) + draf per postingan
-- Jalankan SETELAH supabase-schema.sql, supabase-posts.sql, supabase-metadata.sql (aman diulang).

alter table public.posts add column if not exists published boolean not null default true;
alter table public.spatial_layers add column if not exists post_id uuid references public.posts on delete cascade;
alter table public.spatial_layers add column if not exists sort_order int default 0;
alter table public.spatial_layers add column if not exists style_attr text;
alter table public.spatial_layers add column if not exists style_colormap jsonb default '{}'::jsonb;

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='posts' and column_name='layer_id') then
    -- layer yang sudah punya postingan -> ikut postingan itu (gaya warna dipindah ke layer)
    update public.spatial_layers s
       set post_id = p.id, style_attr = p.preview_attr, style_colormap = coalesce(p.preview_colormap, '{}'::jsonb)
      from public.posts p where p.layer_id = s.id and s.post_id is null;
    -- layer draf tanpa postingan -> dijadikan 1 postingan draf masing-masing
    with o as (select id, user_id, name from public.spatial_layers where post_id is null),
         n as (insert into public.posts (user_id, layer_id, title, published)
               select user_id, id, name, false from o returning id, layer_id)
    update public.spatial_layers s set post_id = n.id from n where s.id = n.layer_id;
    drop policy if exists "Pemilik layer dapat memposting" on public.posts;
    drop policy if exists "Layer dapat dilihat pemilik atau jika diposting" on public.spatial_layers;
    drop policy if exists "Layer dapat dilihat pemilik atau jika publik" on public.spatial_layers;
    alter table public.posts drop column layer_id;
  end if;
end $$;
alter table public.spatial_layers alter column post_id set not null;
create index if not exists spatial_layers_post_idx on public.spatial_layers (post_id, sort_order);

-- Postingan: publik hanya jika published; draf hanya terlihat pemiliknya
drop policy if exists "Postingan dapat dilihat semua" on public.posts;
drop policy if exists "Postingan terbit atau milik sendiri" on public.posts;
create policy "Postingan terbit atau milik sendiri" on public.posts for select using (published or auth.uid() = user_id);
drop policy if exists "Pemilik dapat membuat postingan" on public.posts;
create policy "Pemilik dapat membuat postingan" on public.posts for insert with check (auth.uid() = user_id);

-- Layer: terlihat pemilik, atau siapa pun jika postingannya terbit
drop policy if exists "Layer terlihat jika milik sendiri atau postingan terbit" on public.spatial_layers;
create policy "Layer terlihat jika milik sendiri atau postingan terbit" on public.spatial_layers for select
  using (auth.uid() = user_id or exists (select 1 from public.posts p where p.id = spatial_layers.post_id and p.published));
drop policy if exists "Pengguna dapat menyisipkan layernya sendiri" on public.spatial_layers;
create policy "Pengguna dapat menyisipkan layernya sendiri" on public.spatial_layers for insert
  with check (auth.uid() = user_id and exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid()));
drop policy if exists "Pengguna dapat mengubah layernya sendiri" on public.spatial_layers;
create policy "Pengguna dapat mengubah layernya sendiri" on public.spatial_layers for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid()));

notify pgrst, 'reload schema';
