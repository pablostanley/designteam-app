import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'

// GET /api/teams — list public teams (or user's own)
// Query params: ?user=me (authenticated user's teams), default = recent public
export async function GET(request: NextRequest) {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  const userParam = request.nextUrl.searchParams.get('user')

  if (userParam === 'me') {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { data, error } = await supabase
      .from('teams')
      .select('id, short_id, name, agent_count, is_public, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(50)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ teams: data })
  }

  // Default: recent public teams
  const { data, error } = await supabase
    .from('teams')
    .select('id, short_id, name, agent_count, fork_count, created_at')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ teams: data })
}

// POST /api/teams — create a new team
export async function POST(request: NextRequest) {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  const body = await request.json()
  const { name, team_data } = body

  if (!team_data || typeof team_data !== 'object') {
    return NextResponse.json({ error: 'Invalid team_data' }, { status: 400 })
  }

  const agents = Array.isArray(team_data.agents) ? team_data.agents : []
  if (agents.length > 16) {
    return NextResponse.json({ error: 'Too many agents (max 16)' }, { status: 400 })
  }

  const teamName = typeof name === 'string' ? name.slice(0, 100) : 'My Team'

  // Get user if authenticated (optional)
  const { data: { user } } = await supabase.auth.getUser()

  const shortId = nanoid(8)
  const agentCount = agents.length

  const { data, error } = await supabase
    .from('teams')
    .insert({
      short_id: shortId,
      name: teamName,
      team_data,
      agent_count: agentCount,
      user_id: user?.id ?? null,
      is_public: true,
    })
    .select('id, short_id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ team: data, url: `/team/${data.short_id}` }, { status: 201 })
}
