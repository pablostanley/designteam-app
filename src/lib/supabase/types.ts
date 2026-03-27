export interface DbTeam {
  id: string
  short_id: string
  name: string
  team_data: unknown  // JSON — will be cast to Team
  agent_count: number
  user_id: string | null
  is_public: boolean
  fork_count: number
  forked_from: string | null
  created_at: string
  updated_at: string
}

export interface DbProfile {
  id: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
}
