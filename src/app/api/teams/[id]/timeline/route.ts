import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MAX_CONTENT_CHARS = 500
const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 200
const VALID_OUTCOMES = new Set(['completed', 'approved', 'rejected', 'praised', 'handoff', 'delivered'])

/**
 * GET /api/teams/:id/timeline — newest-first activity log
 *
 * Powers the team page's project timeline section. Reads task_events
 * (migration 005). RLS already gates public vs. private teams.
 *
 * Query params:
 *   limit — number of rows (default 50, max 200)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const url = new URL(req.url)
  const rawLimit = Number(url.searchParams.get('limit'))
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(MAX_PAGE_SIZE, Math.floor(rawLimit))
    : DEFAULT_PAGE_SIZE

  const supabase = await createClient()

  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('id, short_id')
    .eq('short_id', id)
    .single()

  if (teamError || !team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  }

  const { data: events, error } = await supabase
    .from('task_events')
    .select('id, agent_id, agent_name, outcome, content, created_at')
    .eq('team_id', team.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: 'Failed to load timeline' }, { status: 500 })
  }

  return NextResponse.json({
    team_id: team.id,
    short_id: team.short_id,
    events: events || [],
  })
}

/**
 * POST /api/teams/:id/timeline — append one task event
 *
 * Body: { agent_id, agent_name, outcome, content? }
 *
 * Used by: `designteam report` CLI after the agent_states update
 * completes. RLS blocks writes unless the caller owns the team.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { agent_id, agent_name, outcome, content } = body as {
    agent_id?: unknown
    agent_name?: unknown
    outcome?: unknown
    content?: unknown
  }

  if (typeof agent_id !== 'string' || !agent_id) {
    return NextResponse.json({ error: 'agent_id required' }, { status: 400 })
  }
  if (typeof agent_name !== 'string' || !agent_name) {
    return NextResponse.json({ error: 'agent_name required' }, { status: 400 })
  }
  if (typeof outcome !== 'string' || !VALID_OUTCOMES.has(outcome)) {
    return NextResponse.json({ error: 'outcome must be one of ' + [...VALID_OUTCOMES].join(', ') }, { status: 400 })
  }
  const contentStr = typeof content === 'string' ? content.slice(0, MAX_CONTENT_CHARS) : null

  const supabase = await createClient()

  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('id')
    .eq('short_id', id)
    .single()

  if (teamError || !team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('task_events')
    .insert({
      team_id: team.id,
      agent_id,
      agent_name,
      outcome,
      content: contentStr,
    })
    .select('id, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to log event' }, { status: 500 })
  }

  return NextResponse.json({ event: data })
}
