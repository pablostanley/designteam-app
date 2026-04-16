-- Agent living state — tamagotchi persistence (emotions, memories, XP, level)
create table public.agent_states (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  agent_id text not null,
  role text not null,

  -- Living state (full JSON for flexibility — schema evolves in @designteam/core)
  emotions jsonb not null default '{"energy":80,"confidence":60,"enthusiasm":70,"frustration":10,"inspiration":50}',
  memories jsonb not null default '[]',
  xp integer not null default 0,
  level integer not null default 1,
  tasks_completed integer not null default 0,
  tasks_approved integer not null default 0,

  -- Timestamps
  last_active_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- One state per agent per team
  unique(team_id, agent_id)
);

create index agent_states_team_id_idx on public.agent_states(team_id);

-- RLS
alter table public.agent_states enable row level security;

-- Anyone can read agent states for public teams
create policy "Agent states readable for public teams"
  on public.agent_states for select
  using (
    exists (
      select 1 from public.teams
      where teams.id = agent_states.team_id
      and (teams.is_public = true or teams.user_id = auth.uid())
    )
  );

-- Team owner can insert/update/delete
create policy "Team owner can manage agent states"
  on public.agent_states for all
  using (
    exists (
      select 1 from public.teams
      where teams.id = agent_states.team_id
      and teams.user_id = auth.uid()
    )
  );

-- Anonymous teams: anyone can manage (no user_id on team)
create policy "Anonymous team agent states are manageable"
  on public.agent_states for all
  using (
    exists (
      select 1 from public.teams
      where teams.id = agent_states.team_id
      and teams.user_id is null
    )
  );

-- Auto-update updated_at
create trigger agent_states_updated_at
  before update on public.agent_states
  for each row execute function public.update_updated_at();


-- Team relationships — synergy, bonds, collaboration history
create table public.team_relationships (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,

  -- Full relationship graph as JSON array
  relationships jsonb not null default '[]',

  -- Timestamps
  updated_at timestamptz not null default now(),

  -- One graph per team
  unique(team_id)
);

-- RLS
alter table public.team_relationships enable row level security;

-- Same policies as agent_states
create policy "Relationships readable for public teams"
  on public.team_relationships for select
  using (
    exists (
      select 1 from public.teams
      where teams.id = team_relationships.team_id
      and (teams.is_public = true or teams.user_id = auth.uid())
    )
  );

create policy "Team owner can manage relationships"
  on public.team_relationships for all
  using (
    exists (
      select 1 from public.teams
      where teams.id = team_relationships.team_id
      and teams.user_id = auth.uid()
    )
  );

create policy "Anonymous team relationships are manageable"
  on public.team_relationships for all
  using (
    exists (
      select 1 from public.teams
      where teams.id = team_relationships.team_id
      and teams.user_id is null
    )
  );

create trigger team_relationships_updated_at
  before update on public.team_relationships
  for each row execute function public.update_updated_at();
