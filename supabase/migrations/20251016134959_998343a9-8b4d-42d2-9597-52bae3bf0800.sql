-- Storage policies for Talent Pool uploads
-- Drop existing policies if any
drop policy if exists "Public read: talent pool buckets" on storage.objects;
drop policy if exists "Upload photos in own folder" on storage.objects;
drop policy if exists "Update photos in own folder" on storage.objects;
drop policy if exists "Delete photos in own folder" on storage.objects;
drop policy if exists "Upload CV in own folder" on storage.objects;
drop policy if exists "Update CV in own folder" on storage.objects;
drop policy if exists "Delete CV in own folder" on storage.objects;
drop policy if exists "Upload cover letter in own folder" on storage.objects;
drop policy if exists "Update cover letter in own folder" on storage.objects;
drop policy if exists "Delete cover letter in own folder" on storage.objects;

-- Public read for public buckets
create policy "Public read: talent pool buckets"
  on storage.objects
  for select
  using (bucket_id in ('talent-pool-photos','talent-pool-cv','talent-pool-covers'));

-- Authenticated users can upload/update/delete only within their own folder (first path segment = auth.uid())
create policy "Upload photos in own folder"
  on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'talent-pool-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Update photos in own folder"
  on storage.objects
  for update to authenticated
  using (
    bucket_id = 'talent-pool-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Delete photos in own folder"
  on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'talent-pool-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Upload CV in own folder"
  on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'talent-pool-cv'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Update CV in own folder"
  on storage.objects
  for update to authenticated
  using (
    bucket_id = 'talent-pool-cv'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Delete CV in own folder"
  on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'talent-pool-cv'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Upload cover letter in own folder"
  on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'talent-pool-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Update cover letter in own folder"
  on storage.objects
  for update to authenticated
  using (
    bucket_id = 'talent-pool-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Delete cover letter in own folder"
  on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'talent-pool-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );