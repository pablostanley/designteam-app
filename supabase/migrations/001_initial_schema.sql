-- Teams table
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  short_id text unique not null,
  name text not null default 'My Team',
  team_data jsonb not null,
  agent_count integer not null default 0,

  -- Ownership (nullable for anonymous teams)
  user_id uuid references auth.users(id) on delete set null,

  -- Sharing
  is_public boolean not null default true,
  fork_count integer not null default 0,
  forked_from uuid references public.teams(id) on delete set null,

  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index teams_short_id_idx on public.teams(short_id);
create index teams_user_id_idx on public.teams(user_id);
create index teams_is_public_idx on public.teams(is_public) where is_public = true;
create index teams_created_at_idx on public.teams(created_at desc);

-- RLS
alter table public.teams enable row level security;

-- Anyone can read public teams
create policy "Public teams are viewable by anyone"
  on public.teams for select
  using (is_public = true);

-- Authenticated users can read their own teams (public or private)
create policy "Users can view own teams"
  on public.teams for select
  using (auth.uid() = user_id);

-- Anyone can create teams (anonymous or authenticated)
create policy "Anyone can create teams"
  on public.teams for insert
  with check (true);

-- Only owner can update
create policy "Users can update own teams"
  on public.teams for update
  using (auth.uid() = user_id);

-- Only owner can delete
create policy "Users can delete own teams"
  on public.teams for delete
  using (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger teams_updated_at
  before update on public.teams
  for each row execute function public.update_updated_at();

-- User profiles (optional, for display names)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by anyone"
  on public.profiles for select
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- RPC: increment fork count
create or replace function public.increment_fork_count(team_id uuid)
returns void as $$
  update public.teams set fork_count = fork_count + 1 where id = team_id;
$$ language sql;
