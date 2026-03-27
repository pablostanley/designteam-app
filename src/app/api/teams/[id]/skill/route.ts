import { NextRequest } from 'next/server'

// GET /api/teams/:id/skill — returns raw SKILL.md content
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { id } = await params

  const isUuid = id.length === 36 && id.includes('-')
  const column = isUuid ? 'id' : 'short_id'

  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq(column, id)
    .eq('is_public', true)
    .single()

  if (error || !data) {
    return new Response('Team not found', { status: 404, headers: { 'Content-Type': 'text/plain' } })
  }

  const team = data.team_data
  const agents = team?.agents ?? []
  const lines = [`# ${data.name}\n`]
  lines.push(`${agents.length} agents configured.\n`)

  for (const agent of agents) {
    lines.push(`## ${agent.name} (${agent.role})`)
    if (agent.traits?.length) lines.push(`Traits: ${agent.traits.join(', ')}`)
    if (agent.customPrompt) lines.push(`Instructions: ${agent.customPrompt}`)
    lines.push('')
  }

  return new Response(lines.join('\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
    },
  })
}
