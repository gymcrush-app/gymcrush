-- Allow upsert: storage upload with upsert: true needs UPDATE and SELECT on storage.objects

-- RLS: users can UPDATE objects in their own folder (avatars/{user_id}/...)
create policy "Users can update own avatars"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: users can SELECT objects in their own folder (needed for upsert existence check)
create policy "Users can select own avatars"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
