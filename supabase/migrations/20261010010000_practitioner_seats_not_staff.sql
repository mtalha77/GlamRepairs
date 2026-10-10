-- A practitioner's studio seat is not a staff seat (HANDOVER-52 §4.4).
--
-- `private.is_studio_member()` gated team chat, the member list, SEO and
-- media writes, gift codes, Search Console data and — through storage —
-- every client's assessment photographs. A practitioner sees only her own
-- consultations, and those pages read through the service role after a
-- server-side check, so her seat needs none of that.
--
-- She still needs her own notifications, so those policies move to a
-- narrower `private.has_studio_seat()`.

create or replace function private.is_studio_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.studio_members
    where user_id = auth.uid()
      and member_kind is distinct from 'practitioner'
  );
$$;

create or replace function private.has_studio_seat()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.studio_members where user_id = auth.uid());
$$;

revoke all on function private.has_studio_seat() from public, anon;
grant execute on function private.has_studio_seat() to authenticated, service_role;

alter policy "studio members read own notifications" on public.studio_notifications
  using (private.has_studio_seat() and recipient_id = auth.uid());

alter policy "studio members update own notifications" on public.studio_notifications
  using (private.has_studio_seat() and recipient_id = auth.uid())
  with check (private.has_studio_seat() and recipient_id = auth.uid());
