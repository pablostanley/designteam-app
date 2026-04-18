"use client"

/**
 * Relationship Map — circular graph of agent-to-agent bonds.
 *
 * Laid out as a circle (agents around the perimeter, edges crossing through).
 * Bond value drives edge color: warm foreground for positive, muted for
 * neutral, red for negative. Collaboration count drives stroke width so
 * heavy collaborators read louder than one-off pairs.
 *
 * Pure SVG, no deps. Static layout (not force-directed) because team sizes
 * are small (≤ 16 agents) and deterministic positions make the picture
 * stable across renders.
 */

import type { Agent, AgentRelationship } from "@/lib/agent-builder/types"

interface RelationshipMapProps {
  agents: Agent[]
  relationships: AgentRelationship[]
}

const SIZE = 320
const PADDING = 36
const NODE_RADIUS = 18

export function RelationshipMap({ agents, relationships }: RelationshipMapProps) {
  if (agents.length < 2) return null

  // Place every agent on a circle, starting at top (-π/2) and going clockwise.
  const cx = SIZE / 2
  const cy = SIZE / 2
  const ringRadius = cx - PADDING
  const positions = new Map<string, { x: number; y: number; angle: number }>()
  agents.forEach((agent, i) => {
    const angle = -Math.PI / 2 + (i / agents.length) * Math.PI * 2
    positions.set(agent.id, {
      x: cx + Math.cos(angle) * ringRadius,
      y: cy + Math.sin(angle) * ringRadius,
      angle,
    })
  })

  // Edges sorted weakest → strongest so strong edges render on top.
  const edges = relationships
    .filter((r) => positions.has(r.agentA) && positions.has(r.agentB))
    .slice()
    .sort((a, b) => Math.abs(a.bond) - Math.abs(b.bond))

  const maxCollabs = edges.reduce((m, r) => Math.max(m, r.collaborations), 0)

  return (
    <figure className="mx-auto w-fit">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width={SIZE}
        height={SIZE}
        className="max-w-full h-auto"
        role="img"
        aria-label="Agent relationship map"
      >
        {/* Background ring so the map reads as a "map" even with few edges */}
        <circle
          cx={cx}
          cy={cy}
          r={ringRadius}
          fill="none"
          stroke="currentColor"
          strokeWidth={1}
          strokeDasharray="2 3"
          className="text-border"
        />

        {/* Edges */}
        {edges.map((edge) => {
          const a = positions.get(edge.agentA)!
          const b = positions.get(edge.agentB)!
          const { stroke, opacity } = edgeStyle(edge.bond)
          const width = edgeWidth(edge.collaborations, maxCollabs)
          return (
            <line
              key={`${edge.agentA}-${edge.agentB}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={stroke}
              strokeOpacity={opacity}
              strokeWidth={width}
              strokeLinecap="round"
            />
          )
        })}

        {/* Nodes + labels */}
        {agents.map((agent) => {
          const pos = positions.get(agent.id)!
          const label = agent.name
          const onLeft = pos.x < cx - 4
          return (
            <g key={agent.id}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={NODE_RADIUS / 2}
                className="fill-foreground stroke-background"
                strokeWidth={2}
              />
              <text
                x={pos.x + (onLeft ? -NODE_RADIUS : NODE_RADIUS)}
                y={pos.y + 4}
                textAnchor={onLeft ? "end" : "start"}
                className="fill-foreground text-[10px] font-medium"
              >
                {label}
              </text>
            </g>
          )
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        <LegendDot label="Strong bond" colorClass="bg-foreground" />
        <LegendDot label="Neutral" colorClass="bg-muted-foreground" />
        <LegendDot label="Friction" colorClass="bg-red-500" />
        <span>Thickness = collaboration count</span>
      </figcaption>
    </figure>
  )
}

function edgeStyle(bond: number): { stroke: string; opacity: number } {
  // Bond ranges roughly [-1, 1] but nothing stops it from drifting; clamp.
  const b = Math.max(-1, Math.min(1, bond))
  if (b >= 0.3) return { stroke: "currentColor", opacity: 0.6 + b * 0.4 } // foreground
  if (b <= -0.3) return { stroke: "#ef4444", opacity: Math.min(0.8, Math.abs(b) + 0.3) }
  return { stroke: "currentColor", opacity: 0.2 } // neutral
}

function edgeWidth(collabs: number, max: number): number {
  if (max <= 0) return 1
  return 1 + (collabs / max) * 3
}

function LegendDot({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-block w-2 h-0.5 rounded-full ${colorClass}`} aria-hidden />
      <span>{label}</span>
    </span>
  )
}
