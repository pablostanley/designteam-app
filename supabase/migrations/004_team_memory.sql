-- Team memory — shared knowledge every agent on the team can read
-- Separate from per-agent memories (agent_states.memories).
-- Use cases: brand facts, project context, user preferences the team learned.
create table public.team_memory (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,

  -- What category of memory is this?
  -- 'brand'     — colors, voice, typography, visual identity
  -- 'project'   — constraints, audience, deadlines, tech stack
  -- 'user'      — user's preferences, style, past decisions
  -- 'decision'  — team decisions ("we tried X, user didn't like it")
  -- 'fact'      — general facts the team should remember
  category text not null default 'fact',

  content text not null,
  salience real not null default 0.7,  -- 0–1, decays like agent memory
  source text,                          -- "Nova", "Scout", "user", etc.

  created_at timestamptz not null default now(),
  last_relevant_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index team_memory_team_id_idx on public.team_memory(team_id);
create index team_memory_category_idx on public.team_memory(category);

-- RLS — same pattern as agent_states
alter table public.team_memory enable row level security;

create policy "Team memory readable for public teams"
  on public.team_memory for select
  using (
    exists (
      select 1 from public.teams
      where teams.id = team_memory.team_id
      and (teams.is_public = true or teams.user_id = auth.uid())
    )
  );

create policy "Team owner can manage team memory"
  on public.team_memory for all
  using (
    exists (
      select 1 from public.teams
      where teams.id = team_memory.team_id
      and teams.user_id = auth.uid()
    )
  );

create policy "Anonymous team memory is manageable"
  on public.team_memory for all
  using (
    exists (
      select 1 from public.teams
      where teams.id = team_memory.team_id
      and teams.user_id is null
    )
  );

create trigger team_memory_updated_at
  before update on public.team_memory
  for each row execute function public.update_updated_at();
