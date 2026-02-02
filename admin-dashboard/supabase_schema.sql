-- 1. Create table for admin users
create table if not exists public.admin_users (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  role text default 'editor',
  status text default 'pending', -- pending, approved, suspended
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable RLS
alter table public.admin_users enable row level security;

-- 3. Create Helper Function to avoid Recursion
-- This function runs with SECURITY DEFINER, meaning it bypasses RLS
-- allowing us to check the user's status without triggering the policy again.
create or replace function public.check_is_admin()
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

-- 4. Policies
-- Drop existing policies to ensure idempotency
drop policy if exists "Users can view own profile" on public.admin_users;
drop policy if exists "Users can update own profile" on public.admin_users;
drop policy if exists "Approved admins can view all" on public.admin_users;
drop policy if exists "Approved admins can update" on public.admin_users;

-- Allow users to view their own profile
create policy "Users can view own profile" on public.admin_users
  for select using (auth.uid() = id);

-- Allow users to update their own profile (name, etc)
create policy "Users can update own profile" on public.admin_users
  for update using (auth.uid() = id);

-- Allow approved admins to view all profiles (using helper function)
create policy "Approved admins can view all" on public.admin_users
  for select using ( public.check_is_admin() );

-- Allow approved admins to update profiles (using helper function)
create policy "Approved admins can update" on public.admin_users
  for update using ( public.check_is_admin() );

-- 5. Auto-create admin_user on signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.admin_users (id, email, full_name, role, status)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'editor', 'pending');
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists to avoid errors on re-run
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
