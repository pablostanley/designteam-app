import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/teams/:id/state — fetch all agent states + relationships for a team
 *
 * Used by: `designteam pull`, `designteam sync` (pull phase)
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const supabase = await createClient()

  // Fetch team to verify it exists and check access
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('id, short_id, name, user_id, is_public')
    .eq('short_id', id)
    .single()

  if (teamError || !team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  }

  // Fetch agent states
  const { data: states } = await supabase
    .from('agent_states')
    .select('agent_id, role, emotions, memories, xp, level, tasks_completed, tasks_approved, last_active_at, updated_at')
    .eq('team_id', team.id)

  // Fetch relationships
  const { data: rels } = await supabase
    .from('team_relationships')
    .select('relationships, updated_at')
    .eq('team_id', team.id)
    .single()

  return NextResponse.json({
    team_id: team.id,
    short_id: team.short_id,
    agent_states: states || [],
    relationships: rels?.relationships || [],
    relationships_updated_at: rels?.updated_at || null,
  })
}

/**
 * PUT /api/teams/:id/state — sync agent states + relationships
 *
 * Used by: `designteam sync` (push phase), `designteam report` (auto-sync)
 * Body: { agent_states: [...], relationships: [...] }
 *
 * Conflict resolution: latest updated_at wins per agent.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await req.json()

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const supabase = await createClient()

  // Find team
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('id, short_id, user_id')
    .eq('short_id', id)
    .single()

  if (teamError || !team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  }

  const results = { agents_synced: 0, relationships_synced: false }

  // Upsert agent states
  if (Array.isArray(body.agent_states)) {
    for (const state of body.agent_states) {
      if (!state.agent_id || !state.role) continue

      const { error } = await supabase
        .from('agent_states')
        .upsert({
          team_id: team.id,
          agent_id: state.agent_id,
          role: state.role,
          emotions: state.emotions || {},
          memories: state.memories || [],
          xp: state.xp || 0,
          level: state.level || 1,
          tasks_completed: state.tasks_completed || 0,
          tasks_approved: state.tasks_approved || 0,
          last_active_at: state.last_active_at || null,
        }, {
          onConflict: 'team_id,agent_id',
        })

      if (!error) results.agents_synced++
    }
  }

  // Upsert relationships
  if (Array.isArray(body.relationships)) {
    const { error } = await supabase
      .from('team_relationships')
      .upsert({
        team_id: team.id,
        relationships: body.relationships,
      }, {
        onConflict: 'team_id',
      })

    if (!error) results.relationships_synced = true
  }

  return NextResponse.json(results)
}
