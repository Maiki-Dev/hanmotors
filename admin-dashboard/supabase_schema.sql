-- 1. Create table for admin users
create table if not exists public.admin_users (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  role text default 'editor', -- 'super_admin', 'editor'
  status text default 'pending', -- pending, approved, suspended
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable RLS
alter table public.admin_users enable row level security;

-- 3. Create Helper Functions
-- Check if user is approved (any role)
create or replace function public.check_is_approved()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where id = auth.uid()
    and status = 'approved'
  );
$$;

-- Check if user is super_admin
create or replace function public.check_is_super_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where id = auth.uid()
    and role = 'super_admin'
    and status = 'approved'
  );
$$;

-- 4. Policies
-- Drop existing policies
drop policy if exists "Users can view own profile" on public.admin_users;
drop policy if exists "Users can update own profile" on public.admin_users;
drop policy if exists "Approved admins can view all" on public.admin_users;
drop policy if exists "Approved admins can update" on public.admin_users;
drop policy if exists "Super admins can update all" on public.admin_users;

-- Allow users to view their own profile
create policy "Users can view own profile" on public.admin_users
  for select using (auth.uid() = id);

-- Allow users to update their own profile
create policy "Users can update own profile" on public.admin_users
  for update using (auth.uid() = id);

-- Allow approved admins (any role) to view all profiles
create policy "Approved admins can view all" on public.admin_users
  for select using ( public.check_is_approved() );

-- Allow ONLY super admins to update any profile (to approve/suspend others)
create policy "Super admins can update all" on public.admin_users
  for update using ( public.check_is_super_admin() );

-- 5. Auto-create admin_user on signup
create or replace function public.handle_new_user() 
returns trigger as $$
declare
  is_super_admin boolean;
begin
  -- Check if this is the specific super admin email
  if new.email = 'nozum1ke@gmail.com' then
    insert into public.admin_users (id, email, full_name, role, status)
    values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'super_admin', 'approved');
  else
    insert into public.admin_users (id, email, full_name, role, status)
    values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'editor', 'pending');
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. SEED Super Admin (Run this manually or it will run on schema apply if user exists)
-- Attempt to update the specific user to super_admin if they exist
do $$
begin
  update public.admin_users
  set role = 'super_admin', status = 'approved'
  where email = 'nozum1ke@gmail.com';
end $$;
