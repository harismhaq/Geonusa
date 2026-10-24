-- GeoNusa: thumbnail berupa gambar (akurat, tanpa celah antar poligon) — aman diulang
alter table public.posts add column if not exists preview_img text;      -- gambar transparan (webp/png, data URL)
alter table public.posts add column if not exists preview_bounds jsonb;  -- [[selatan,barat],[utara,timur]]
notify pgrst, 'reload schema';
