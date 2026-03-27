import { NextRequest, NextResponse } from 'next/server'

// GET /api/teams/:id — get team by short_id or uuid
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { id } = await params

  // Try short_id first, then uuid
  const isUuid = id.length === 36 && id.includes('-')
  const column = isUuid ? 'id' : 'short_id'

  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq(column, id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  return NextResponse.json({ team: data })
}

// PUT /api/teams/:id — update team (owner only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { id } = await params
  const body = await request.json()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const isUuid = id.length === 36 && id.includes('-')
  const column = isUuid ? 'id' : 'short_id'

  const updates: Record<string, unknown> = {}
  if (body.name) updates.name = body.name
  if (body.team_data) {
    updates.team_data = body.team_data
    updates.agent_count = Array.isArray(body.team_data.agents) ? body.team_data.agents.length : 0
  }
  if (typeof body.is_public === 'boolean') updates.is_public = body.is_public

  const { data, error } = await supabase
    .from('teams')
    .update(updates)
    .eq(column, id)
    .eq('user_id', user.id)
    .select('id, short_id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 })
  return NextResponse.json({ team: data })
}

// DELETE /api/teams/:id — delete team (owner only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { id } = await params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const isUuid = id.length === 36 && id.includes('-')
  const column = isUuid ? 'id' : 'short_id'

  const { error } = await supabase
    .from('teams')
    .delete()
    .eq(column, id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
