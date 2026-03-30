-- Public read access for avatars bucket.
-- The bucket is marked public, but RLS still needs a SELECT policy to allow anon/public reads.

CREATE POLICY "Public can read avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

