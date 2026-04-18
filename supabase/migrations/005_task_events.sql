-- Task events — append-only log of what agents did and how it went.
-- Powers the public team page's project timeline ("Apr 18: Nova approved
-- Pixel's logo"). Separate from agent_states so we keep individual events
-- after counters tick up, and separate from team_memory so we don't
-- confuse durable facts with ephemeral activity.
create table public.task_events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  agent_id text not null,
  agent_name text not null,

  -- Matches CLI report outcomes + extras that could come from Efecto later.
  -- 'completed' / 'approved' / 'rejected' / 'praised' come from the report
  -- command. 'handoff' / 'delivered' reserved for future event sources.
  outcome text not null,

  -- What the agent did, in their own words (or the user's flag value).
  -- Trimmed to 500 chars at the write path to keep payloads tight.
  content text,

  created_at timestamptz not null default now()
);

create index task_events_team_created_idx on public.task_events(team_id, created_at desc);

-- RLS — mirror team_memory: public teams readable to anyone, owned teams
-- writable by the owner. CLI writes via the service role through the API.
alter table public.task_events enable row level security;

create policy "Task events readable for public teams"
  on public.task_events for select
  using (
    exists (
      select 1 from public.teams
      where teams.id = task_events.team_id
      and (teams.is_public = true or teams.user_id = auth.uid())
    )
  );

create policy "Task events writable by team owner"
  on public.task_events for insert
  with check (
    exists (
      select 1 from public.teams
      where teams.id = task_events.team_id
      and teams.user_id = auth.uid()
    )
  );

create policy "Task events deletable by team owner"
  on public.task_events for delete
  using (
    exists (
      select 1 from public.teams
      where teams.id = task_events.team_id
      and teams.user_id = auth.uid()
    )
  );

-- Anonymous teams (user_id IS NULL) need to be writable by the CLI without
-- a session. Matches the "Anonymous team agent states are manageable"
-- policy on agent_states (migration 003) so `designteam report` can push
-- task events for teams created from the CLI.
create policy "Anonymous team task events are manageable"
  on public.task_events for all
  using (
    exists (
      select 1 from public.teams
      where teams.id = task_events.team_id
      and teams.user_id is null
    )
  );
