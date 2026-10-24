-- GeoNusa: profil lengkap (foto, instansi, lokasi, situs web) — aman diulang
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists organization text;
alter table public.profiles add column if not exists location text;
alter table public.profiles add column if not exists website text;

-- pengguna hanya boleh mengubah kolom profil ini (bukan is_pro)
revoke update on public.profiles from anon, authenticated;
grant update (full_name, bio, avatar_url, organization, location, website) on public.profiles to authenticated;

-- view publik tanpa email
drop view if exists public.public_profiles;
create view public.public_profiles as
  select id, full_name, bio, avatar_url, organization, location, website from public.profiles;
grant select on public.public_profiles to anon, authenticated;

-- bucket foto profil (publik untuk dibaca, maks 2 MB, hanya gambar)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = excluded.allowed_mime_types;

-- setiap pengguna hanya boleh menulis di folder miliknya: avatars/<user_id>/...
drop policy if exists "Avatar dapat dilihat semua" on storage.objects;
create policy "Avatar dapat dilihat semua" on storage.objects for select using (bucket_id = 'avatars');
drop policy if exists "Pengguna mengunggah avatarnya" on storage.objects;
create policy "Pengguna mengunggah avatarnya" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Pengguna mengganti avatarnya" on storage.objects;
create policy "Pengguna mengganti avatarnya" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Pengguna menghapus avatarnya" on storage.objects;
create policy "Pengguna menghapus avatarnya" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

notify pgrst, 'reload schema';
