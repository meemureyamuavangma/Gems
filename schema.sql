-- ============================================================
-- AURELIA OWNER-MANAGED CATALOG
-- Run this complete file in Supabase > SQL Editor.
-- ============================================================

-- 1. Administrator table
-- No browser user can read or modify this table directly.
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

-- 2. Secure helper function used by Row Level Security
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.app_admins
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- 3. Website items
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 90),
  category text not null default '',
  description text not null default '',
  price numeric(12,2) not null default 0 check (price >= 0),
  image_url text not null default '',
  published boolean not null default false,
  featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.items enable row level security;

-- 4. Automatically maintain updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists items_set_updated_at on public.items;

create trigger items_set_updated_at
before update on public.items
for each row
execute function public.set_updated_at();

-- 5. Remove old policies when rerunning this file
drop policy if exists "Public can view published items" on public.items;
drop policy if exists "Admins can view all items" on public.items;
drop policy if exists "Admins can create items" on public.items;
drop policy if exists "Admins can update items" on public.items;
drop policy if exists "Admins can delete items" on public.items;

-- 6. Public visitors can only read published items
create policy "Public can view published items"
on public.items
for select
to anon, authenticated
using (published = true);

-- 7. Registered administrators can see drafts and published items
create policy "Admins can view all items"
on public.items
for select
to authenticated
using ((select public.is_admin()));

-- 8. Only registered administrators can change data
create policy "Admins can create items"
on public.items
for insert
to authenticated
with check ((select public.is_admin()));

create policy "Admins can update items"
on public.items
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admins can delete items"
on public.items
for delete
to authenticated
using ((select public.is_admin()));

-- 9. Data API permissions. Row Level Security still controls access.
grant select on public.items to anon;
grant select, insert, update, delete on public.items to authenticated;

-- 10. Optional sample items
insert into public.items
  (id, name, category, description, price, image_url, published, featured, sort_order)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'Signature Experience',
    'Collection',
    'A premium sample item demonstrating the large featured presentation.',
    25000,
    'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1600&q=85',
    true,
    true,
    1
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'Essential Collection',
    'Featured',
    'A clean sample card that can be replaced through the owner dashboard.',
    12500,
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1400&q=85',
    true,
    false,
    2
  )
on conflict (id) do nothing;

-- ============================================================
-- FINAL OWNER SETUP
--
-- A. In Supabase Dashboard, open:
--    Authentication > Users > Add user
--
-- B. Create the owner's email and password.
--
-- C. Copy that user's UUID and run this command separately:
--
-- insert into public.app_admins (user_id)
-- values ('PASTE-THE-OWNER-USER-UUID-HERE')
-- on conflict (user_id) do nothing;
--
-- D. Disable public user sign-ups in Authentication settings.
-- ============================================================
