-- Every upload gets a scan record. A file that has not passed is not shown to
-- anybody, and a file that failed is never opened by a human.
create table if not exists public.upload_scans (
  id             uuid primary key default gen_random_uuid(),
  bucket         text not null,
  storage_path   text not null,
  lead_id        uuid references public.leads(id) on delete cascade,
  application_id uuid references public.practitioner_applications(id) on delete cascade,
  practitioner_id uuid references public.practitioner_profiles(id) on delete cascade,

  declared_mime  text not null,
  detected_mime  text,
  bytes          bigint not null,
  sha256         text,
  width          integer,
  height         integer,

  status         text not null default 'pending',
  failed_checks  text[] not null default '{}',
  detail         text,
  scanned_at     timestamptz,
  quarantined_at timestamptz,
  deleted_at     timestamptz,
  created_at     timestamptz not null default now(),

  constraint upload_scans_status_check
    check (status in ('pending','clean','suspicious','rejected','quarantined')),
  constraint upload_scans_bytes_positive check (bytes > 0),
  constraint upload_scans_sha_fmt check (sha256 is null or sha256 ~ '^[a-f0-9]{64}$'),
  -- A rejection must say why, or nobody can debug a false positive
  constraint upload_scans_rejected_has_reason
    check (status not in ('rejected','suspicious','quarantined')
           or array_length(failed_checks,1) >= 1)
);

create index if not exists upload_scans_path_idx on public.upload_scans (bucket, storage_path);
create index if not exists upload_scans_pending_idx on public.upload_scans (created_at)
  where status = 'pending';
create index if not exists upload_scans_bad_idx on public.upload_scans (created_at desc)
  where status in ('suspicious','rejected','quarantined');
-- The same malicious file uploaded twice is worth spotting
create index if not exists upload_scans_sha_idx on public.upload_scans (sha256)
  where sha256 is not null;

-- 🔴 Only clean files may be shown. The studio and the practitioner portal read
-- this, never storage directly.
create or replace view public.safe_uploads as
select s.bucket, s.storage_path, s.lead_id, s.application_id, s.practitioner_id,
       s.detected_mime, s.bytes, s.width, s.height, s.sha256, s.created_at
  from public.upload_scans s
 where s.status = 'clean' and s.deleted_at is null;

-- What a human needs to look at
create or replace view public.upload_quarantine as
select s.id, s.created_at, s.bucket, s.storage_path, s.declared_mime,
       s.detected_mime, s.bytes, s.status, s.failed_checks, s.detail,
       coalesce(l.email, a.email) as uploaded_by_email,
       coalesce(l.full_name, a.full_name) as uploaded_by_name
  from public.upload_scans s
  left join public.leads l on l.id = s.lead_id
  left join public.practitioner_applications a on a.id = s.application_id
 where s.status in ('suspicious','rejected','quarantined')
   and s.deleted_at is null
 order by s.created_at desc;

-- Rate limiting. One person flooding the bucket is the cheapest attack there is.
create table if not exists public.upload_attempts (
  id          bigserial primary key,
  ip_hash     text,
  lead_id     uuid,
  application_id uuid,
  bucket      text not null,
  bytes       bigint not null,
  accepted    boolean not null,
  reason      text,
  at          timestamptz not null default now()
);

create index if not exists upload_attempts_ip_window_idx on public.upload_attempts (ip_hash, at desc);
create index if not exists upload_attempts_lead_window_idx on public.upload_attempts (lead_id, at desc);

-- Returns true when this uploader is over the limit in the last hour.
create or replace function public.upload_rate_exceeded(
  p_ip_hash text, p_lead uuid, p_max_files int default 20, p_max_bytes bigint default 104857600
) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(count(*),0) >= p_max_files
      or coalesce(sum(bytes),0) >= p_max_bytes
    from public.upload_attempts
   where at > now() - interval '1 hour'
     and ( (p_ip_hash is not null and ip_hash = p_ip_hash)
        or (p_lead is not null and lead_id = p_lead) );
$$;
