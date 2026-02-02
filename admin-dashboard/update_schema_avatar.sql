-- 1. Add avatar_url to admin_users table
alter table public.admin_users 
add column if not exists avatar_url text;

-- 2. Create avatars bucket (if not exists)
insert into storage.buckets (id, name, public) 
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 3. Storage Policies
-- We do not need to enable RLS on storage.objects as it is enabled by default.
-- Trying to enable it again might cause permission errors if you are not the owner.

-- Drop existing policies to avoid conflicts
drop policy if exists "Avatar images are publicly accessible" on storage.objects;
drop policy if exists "Authenticated users can upload avatars" on storage.objects;
drop policy if exists "Users can update their own avatar" on storage.objects;
drop policy if exists "Users can delete their own avatar" on storage.objects;

-- Allow public access to view avatars
create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

-- Allow authenticated users to upload avatars
create policy "Authenticated users can upload avatars"
  on storage.objects for insert
  with check ( bucket_id = 'avatars' and auth.role() = 'authenticated' );

-- Allow users to update their own avatar
create policy "Users can update their own avatar"
  on storage.objects for update
  using ( bucket_id = 'avatars' and auth.uid() = owner );

-- Allow users to delete their own avatar
create policy "Users can delete their own avatar"
  on storage.objects for delete
  using ( bucket_id = 'avatars' and auth.uid() = owner );
