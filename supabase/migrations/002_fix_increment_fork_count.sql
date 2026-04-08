-- Fix: increment_fork_count needs SECURITY DEFINER so it works when anonymous
-- users fork a team (caller's RLS would block the update since they're not the owner).
-- Also pin search_path to prevent search-path hijacking.
create or replace function public.increment_fork_count(team_id uuid)
returns void as $$
  update public.teams set fork_count = fork_count + 1 where id = team_id;
$$ language sql security definer set search_path = public;
