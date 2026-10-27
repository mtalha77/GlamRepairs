-- The first version cast bit(64) to bigint, which is SIGNED. A hash of
-- ffffffffffffffff became -1, and the right-shift loop on a negative bigint
-- overflowed smallint. Count the set bits on the bit string itself instead,
-- which has no sign and no loop.
create or replace function public.phash_distance(a text, b text)
returns smallint language sql immutable as $$
  select case
    when a is null or b is null then null
    when a !~ '^[a-f0-9]{16}$' or b !~ '^[a-f0-9]{16}$' then null
    else length(
           replace(
             (('x' || a)::bit(64) # ('x' || b)::bit(64))::text,
             '0', ''
           )
         )::smallint
  end;
$$;
