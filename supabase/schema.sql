-- Jalankan seluruh isi file ini di Supabase: SQL Editor > New query > Run

create table if not exists pengaturan (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'
);
insert into pengaturan (id, data) values (1, '{}') on conflict do nothing;

create table if not exists panitia (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nama text
);

create table if not exists pendaftaran (
  kode text primary key,
  nama text not null, desa text, kec text not null,
  kec_n text not null unique,           -- satu grup per kecamatan
  syekh text, hp text, pembina text,
  metode text not null check (metode in ('online','offline')),
  jumlah int, anggota jsonb not null,
  status text not null default 'Menunggu',
  berkas text not null default 'fisik', -- fisik | menunggu | lengkap
  urut int,
  dibuat timestamptz not null default now()
);

create or replace function public.is_panitia() returns boolean
language sql security definer set search_path = public stable
as $$ select exists (select 1 from panitia where user_id = auth.uid()) $$;

alter table pengaturan enable row level security;
alter table panitia enable row level security;
alter table pendaftaran enable row level security;

create policy "pengaturan dibaca semua" on pengaturan for select using (true);
create policy "pengaturan diubah panitia" on pengaturan for update to authenticated using (is_panitia()) with check (is_panitia());
create policy "panitia melihat dirinya" on panitia for select to authenticated using (user_id = auth.uid());
create policy "pendaftaran dibaca panitia" on pendaftaran for select to authenticated using (is_panitia());
create policy "pendaftaran diubah panitia" on pendaftaran for update to authenticated using (is_panitia()) with check (is_panitia());
create policy "pendaftaran dihapus panitia" on pendaftaran for delete to authenticated using (is_panitia());
-- Pendaftar umum TIDAK punya akses langsung ke tabel; semua lewat API server (service role).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('berkas', 'berkas', false, 8388608, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;

create policy "berkas dibaca panitia" on storage.objects for select to authenticated using (bucket_id = 'berkas' and is_panitia());
create policy "berkas dihapus panitia" on storage.objects for delete to authenticated using (bucket_id = 'berkas' and is_panitia());
