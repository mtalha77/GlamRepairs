-- Perceptual hash for near-duplicate detection, and subject checks so the
-- upload is actually skin rather than a screenshot of a cat.
alter table public.upload_scans
  add column if not exists phash text,
  add column if not exists skin_ratio numeric(5,4),
  add column if not exists faces_found smallint,
  add column if not exists subject_verdict text,
  add column if not exists duplicate_of uuid references public.upload_scans(id) on delete set null,
  add column if not exists dup_distance smallint;

alter table public.upload_scans drop constraint if exists upload_scans_phash_fmt;
alter table public.upload_scans add constraint upload_scans_phash_fmt
  check (phash is null or phash ~ '^[a-f0-9]{16}$');

alter table public.upload_scans drop constraint if exists upload_scans_skin_ratio_range;
alter table public.upload_scans add constraint upload_scans_skin_ratio_range
  check (skin_ratio is null or (skin_ratio >= 0 and skin_ratio <= 1));

alter table public.upload_scans drop constraint if exists upload_scans_subject_check;
alter table public.upload_scans add constraint upload_scans_subject_check
  check (subject_verdict is null or
         subject_verdict in ('face','skin_closeup','probably_not_skin','unknown'));

-- A duplicate must say what it duplicates and how close it is
alter table public.upload_scans drop constraint if exists upload_scans_dup_needs_detail;
alter table public.upload_scans add constraint upload_scans_dup_needs_detail
  check (duplicate_of is null or dup_distance is not null);

-- A file cannot be its own duplicate
alter table public.upload_scans drop constraint if exists upload_scans_dup_not_self;
alter table public.upload_scans add constraint upload_scans_dup_not_self
  check (duplicate_of is null or duplicate_of <> id);

create index if not exists upload_scans_phash_idx on public.upload_scans (phash)
  where phash is not null and deleted_at is null;

-- Hamming distance between two 16-char hex perceptual hashes.
create or replace function public.phash_distance(a text, b text)
returns smallint language plpgsql immutable as $$
declare x bigint; d smallint := 0;
begin
  if a is null or b is null or length(a) <> 16 or length(b) <> 16 then return null; end if;
  -- xor the two 64 bit values, then count the set bits
  x := ('x' || a)::bit(64)::bigint # ('x' || b)::bit(64)::bigint;
  while x <> 0 loop
    d := d + (x & 1)::int;
    x := x >> 1;
  end loop;
  return d;
end $$;

-- Has this person already uploaded something that looks like this?
-- Returns the closest prior upload within the threshold.
create or replace function public.find_near_duplicate(
  p_phash text, p_lead uuid, p_application uuid, p_max_distance int default 8
) returns table (match_id uuid, distance smallint, storage_path text)
language sql stable security definer set search_path = public as $$
  select s.id, public.phash_distance(p_phash, s.phash), s.storage_path
    from public.upload_scans s
   where s.phash is not null
     and s.deleted_at is null
     and s.status in ('clean','pending')
     and ( (p_lead is not null and s.lead_id = p_lead)
        or (p_application is not null and s.application_id = p_application) )
     and public.phash_distance(p_phash, s.phash) <= p_max_distance
   order by public.phash_distance(p_phash, s.phash)
   limit 1;
$$;
