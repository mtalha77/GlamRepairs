-- Handover 70 §1.4: a lead row exists only once the visitor has entered
-- something. Before this, the funnel inserted on page load whenever two
-- answers were present, and timezone plus the practitioner from a card link
-- were enough: six page views became six "clients" on 2 and 3 November.
--
-- The insert now waits for step 1 to be submitted (useFunnelProgressSave,
-- /api/leads/progress). This makes the rule hold whatever the app does.
--
-- Postgres does not allow a subquery in a CHECK constraint, so the key test
-- lives in an immutable function. Its list must match AUTO_ANSWER_KEYS in
-- lib/funnel/autoAnswers.ts.

create or replace function public.lead_has_real_answer(p_answers jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select exists (
    select 1
    from jsonb_object_keys(case when jsonb_typeof(p_answers) = 'object' then p_answers else '{}'::jsonb end) k
    where k not in ('onboarding.timezone',
                    'onboarding.referredBy',
                    'onboarding.preferredPractitioner',
                    'onboarding.country',
                    'onboarding.utm')
  )
$$;

-- Soft-deleted rows are exempt: one empty row from 6 October was already
-- deleted from the studio, and rewriting it would only change history.
alter table public.leads
  add constraint lead_needs_a_real_answer check (
    is_test
    or deleted_at is not null
    or email is not null
    or phone is not null
    or public.lead_has_real_answer(answers)
  );
