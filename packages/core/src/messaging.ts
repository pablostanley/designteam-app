/**
 * Inter-Agent Messaging — agents communicate via typed mailboxes
 *
 * Enables design pipeline workflows: agents hand off work, request reviews,
 * give critiques, and broadcast status updates. Inspired by Claude Code's
 * teammate mailbox pattern.
 *
 * Zero Efecto imports — standalone.
 */

import type { AgentMailbox, AgentMessage, MessageType } from './types'
import { MAX_MAILBOX_MESSAGES } from './types'

// ---------------------------------------------------------------------------
// Message Creation
// ---------------------------------------------------------------------------

let _msgCounter = 0
function messageId(): string {
  return `msg-${Date.now()}-${++_msgCounter}-${Math.random().toString(36).slice(2, 6)}`
}

/**
 * Create a new message. Does NOT deliver it — use `deliverMessage` for that.
 */
export function createMessage(
  from: string,
  to: string,
  type: MessageType,
  content: string,
  payload?: Record<string, unknown>,
): AgentMessage {
  return {
    id: messageId(),
    from,
    to,
    type,
    content,
    payload,
    timestamp: new Date().toISOString(),
    read: false,
  }
}

// ---------------------------------------------------------------------------
// Delivery
// ---------------------------------------------------------------------------

/**
 * Deliver a message to a mailbox. Prunes old read messages if over capacity.
 */
export function deliverMessage(
  mailbox: AgentMailbox,
  message: AgentMessage,
): AgentMailbox {
  let inbox = [...mailbox.inbox, message]

  if (inbox.length > mailbox.maxMessages) {
    inbox = pruneMailbox(inbox, mailbox.maxMessages)
  }

  return { ...mailbox, inbox }
}

/**
 * Deliver a broadcast message to multiple mailboxes.
 */
export function deliverBroadcast(
  mailboxes: AgentMailbox[],
  message: AgentMessage,
): AgentMailbox[] {
  return mailboxes.map((mb) => {
    // Don't deliver to sender
    if (mb.agentId === message.from) return mb
    const personalized = { ...message, to: mb.agentId }
    return deliverMessage(mb, personalized)
  })
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

/**
 * Mark a message as read.
 */
export function markRead(
  mailbox: AgentMailbox,
  messageId: string,
): AgentMailbox {
  return {
    ...mailbox,
    inbox: mailbox.inbox.map((m) =>
      m.id === messageId ? { ...m, read: true } : m,
    ),
  }
}

/**
 * Mark all messages as read.
 */
export function markAllRead(mailbox: AgentMailbox): AgentMailbox {
  return {
    ...mailbox,
    inbox: mailbox.inbox.map((m) => ({ ...m, read: true })),
  }
}

/**
 * Get unread messages, newest first.
 */
export function getUnread(mailbox: AgentMailbox): AgentMessage[] {
  return mailbox.inbox
    .filter((m) => !m.read)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}

/**
 * Get unread count.
 */
export function getUnreadCount(mailbox: AgentMailbox): number {
  return mailbox.inbox.filter((m) => !m.read).length
}

/**
 * Get messages of a specific type.
 */
export function getMessagesByType(
  mailbox: AgentMailbox,
  type: MessageType,
): AgentMessage[] {
  return mailbox.inbox
    .filter((m) => m.type === type)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}

/**
 * Get the conversation thread between two agents (both directions).
 */
export function getThread(
  mailbox: AgentMailbox,
  otherAgentId: string,
): AgentMessage[] {
  return mailbox.inbox
    .filter((m) => m.from === otherAgentId || m.to === otherAgentId)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
}

// ---------------------------------------------------------------------------
// Pruning
// ---------------------------------------------------------------------------

function pruneMailbox(
  inbox: AgentMessage[],
  maxMessages: number,
): AgentMessage[] {
  if (inbox.length <= maxMessages) return inbox

  // Keep all unread messages, prune oldest read messages
  const unread = inbox.filter((m) => !m.read)
  const read = inbox.filter((m) => m.read)

  // If unread alone exceeds max, keep newest unread
  if (unread.length >= maxMessages) {
    return unread
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, maxMessages)
  }

  // Keep all unread + newest read to fill remaining capacity
  const readSlots = maxMessages - unread.length
  const keptRead = read
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, readSlots)

  return [...unread, ...keptRead].sort(
    (a, b) => a.timestamp.localeCompare(b.timestamp),
  )
}

// ---------------------------------------------------------------------------
// Prompt Generation
// ---------------------------------------------------------------------------

/**
 * Generate a prompt fragment from an agent's unread messages.
 * Gives the agent context about what's happening in the team.
 */
export function mailboxToPromptFragment(
  mailbox: AgentMailbox,
  agentNames?: Record<string, string>,
): string {
  const unread = getUnread(mailbox)
  if (unread.length === 0) return ''

  const lines = unread.slice(0, 5).map((m) => {
    const typeLabel = messageTypeLabel(m.type)
    const senderName = agentNames?.[m.from] ?? m.from
    return `- **[${typeLabel}]** from ${senderName}: ${m.content.slice(0, 200)}`
  })

  const extra = unread.length > 5 ? `\n- ...and ${unread.length - 5} more unread messages` : ''

  return `## TEAM MESSAGES\n\nYou have ${unread.length} unread message${unread.length === 1 ? '' : 's'}:\n\n${lines.join('\n')}${extra}\n\nConsider these messages when planning your response.`
}

function messageTypeLabel(type: MessageType): string {
  const labels: Record<MessageType, string> = {
    chat: 'Chat',
    design_handoff: 'Handoff',
    review_request: 'Review Request',
    review_response: 'Review',
    critique: 'Critique',
    broadcast: 'Broadcast',
    direction: 'Direction',
  }
  return labels[type]
}

// ---------------------------------------------------------------------------
// Convenience: common design messages
// ---------------------------------------------------------------------------

/**
 * Create a design handoff message (agent passes work to the next agent).
 */
export function createHandoff(
  fromId: string,
  toId: string,
  description: string,
  designDecisions?: Record<string, unknown>,
): AgentMessage {
  return createMessage(fromId, toId, 'design_handoff', description, {
    designDecisions,
  })
}

/**
 * Create a review request (agent asks another to review their work).
 */
export function createReviewRequest(
  fromId: string,
  toId: string,
  description: string,
  context?: Record<string, unknown>,
): AgentMessage {
  return createMessage(fromId, toId, 'review_request', description, context)
}

/**
 * Create a review response (approval, rejection, or revision request).
 */
export function createReviewResponse(
  fromId: string,
  toId: string,
  approved: boolean,
  feedback: string,
): AgentMessage {
  return createMessage(fromId, toId, 'review_response', feedback, {
    approved,
  })
}

/**
 * Create a creative direction message from the Creative Director.
 */
export function createDirection(
  fromId: string,
  toId: string,
  direction: string,
): AgentMessage {
  return createMessage(fromId, toId, 'direction', direction)
}
