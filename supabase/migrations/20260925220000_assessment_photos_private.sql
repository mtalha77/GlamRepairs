-- HOTFIX-43 §1 / CLAUDE.md Step 1 — assessment photos are private.
--
-- Two holes, closed together:
-- 1. The bucket was public, so /storage/v1/object/public/assessment-photos/…
--    served any object to anyone holding the path.
-- 2. "Public read assessment photos" granted SELECT on every object in the
--    bucket to the `public` role. The anon key ships in every page's
--    JavaScript, so with that policy in place anyone could LIST the bucket
--    through the Storage API and download each file, private flag or not.
--    The "unguessable path" was never the protection it looked like.
--
-- Safe to flip now: every read in the app goes through the service role
-- (upload, delete, and createSignedPhotoUrl behind the auth-gated /p/ route),
-- and at the time of this change no lead row references a live photo.
-- Studio members keep their existing authenticated read policy.
drop policy if exists "Public read assessment photos" on storage.objects;

update storage.buckets set public = false where id = 'assessment-photos';
