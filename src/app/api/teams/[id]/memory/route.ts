import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/teams/:id/memory — fetch team memory entries
 *
 * Mirrors the read surface of /api/teams/:id/state but for shared team
 * knowledge (brand/project/user/decision/fact). RLS already scopes reads
 * to public teams + the owner; this route just joins on short_id so the
 * client never handles raw team UUIDs.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const supabase = await createClient()

  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('id, short_id, is_public')
    .eq('short_id', id)
    .single()

  if (teamError || !team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  }

  const { data: entries, error } = await supabase
    .from('team_memory')
    .select('id, category, content, salience, source, created_at, last_relevant_at')
    .eq('team_id', team.id)
    .order('salience', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Failed to load memory' }, { status: 500 })
  }

  return NextResponse.json({
    team_id: team.id,
    short_id: team.short_id,
    entries: entries || [],
  })
}
