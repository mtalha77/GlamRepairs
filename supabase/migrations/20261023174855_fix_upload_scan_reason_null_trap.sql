-- array_length on an empty array returns NULL, not 0, and a CHECK constraint
-- passes on NULL because it only fails on an explicit FALSE. So the original
-- constraint allowed a rejection with no stated reason, which is exactly the
-- case it was written to prevent.
alter table public.upload_scans
  drop constraint if exists upload_scans_rejected_has_reason;

alter table public.upload_scans
  add constraint upload_scans_rejected_has_reason
  check (
    status not in ('rejected','suspicious','quarantined')
    or coalesce(array_length(failed_checks, 1), 0) >= 1
  );
