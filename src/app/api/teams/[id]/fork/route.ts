import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'

// POST /api/teams/:id/fork — fork a public team
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { id } = await params

  // Get the source team
  const isUuid = id.length === 36 && id.includes('-')
  const column = isUuid ? 'id' : 'short_id'

  const { data: source, error: fetchErr } = await supabase
    .from('teams')
    .select('*')
    .eq(column, id)
    .eq('is_public', true)
    .single()

  if (fetchErr || !source) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

  const { data: { user } } = await supabase.auth.getUser()

  const { data: fork, error: insertErr } = await supabase
    .from('teams')
    .insert({
      short_id: nanoid(8),
      name: `${source.name} (fork)`,
      team_data: source.team_data,
      agent_count: source.agent_count,
      user_id: user?.id ?? null,
      is_public: true,
      forked_from: source.id,
    })
    .select('id, short_id')
    .single()

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  // Increment fork count on source (fire and forget)
  try { await supabase.rpc('increment_fork_count', { team_id: source.id }) } catch {}

  return NextResponse.json({ team: fork, url: `/team/${fork.short_id}` }, { status: 201 })
}
