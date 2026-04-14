import { describe, it, expect } from 'vitest'
import {
  createMessage,
  deliverMessage,
  deliverBroadcast,
  markRead,
  markAllRead,
  getUnread,
  mailboxToPromptFragment,
} from '../src/messaging'
import type { AgentMailbox, AgentMessage } from '../src/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyMailbox(agentId: string, maxMessages = 50): AgentMailbox {
  return { agentId, inbox: [], maxMessages }
}

function fakeMessage(overrides: Partial<AgentMessage> = {}): AgentMessage {
  return {
    id: `msg-${Math.random().toString(36).slice(2, 8)}`,
    from: 'agent-a',
    to: 'agent-b',
    type: 'chat',
    content: 'hello',
    timestamp: new Date().toISOString(),
    read: false,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// createMessage
// ---------------------------------------------------------------------------

describe('createMessage', () => {
  it('creates a message with the correct from/to/type/content', () => {
    const msg = createMessage('alice', 'bob', 'chat', 'hey there')
    expect(msg.from).toBe('alice')
    expect(msg.to).toBe('bob')
    expect(msg.type).toBe('chat')
    expect(msg.content).toBe('hey there')
  })

  it('starts unread', () => {
    const msg = createMessage('a', 'b', 'critique', 'needs work')
    expect(msg.read).toBe(false)
  })

  it('generates a unique id', () => {
    const m1 = createMessage('a', 'b', 'chat', 'one')
    const m2 = createMessage('a', 'b', 'chat', 'two')
    expect(m1.id).not.toBe(m2.id)
  })

  it('includes a valid ISO timestamp', () => {
    const msg = createMessage('a', 'b', 'chat', 'time check')
    expect(new Date(msg.timestamp).toISOString()).toBe(msg.timestamp)
  })

  it('attaches optional payload', () => {
    const msg = createMessage('a', 'b', 'design_handoff', 'here', {
      designDecisions: { palette: 'warm' },
    })
    expect(msg.payload).toEqual({ designDecisions: { palette: 'warm' } })
  })

  it('leaves payload undefined when not provided', () => {
    const msg = createMessage('a', 'b', 'chat', 'no payload')
    expect(msg.payload).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// deliverMessage
// ---------------------------------------------------------------------------

describe('deliverMessage', () => {
  it('adds a message to the inbox', () => {
    const mb = emptyMailbox('bob')
    const msg = fakeMessage({ to: 'bob' })
    const updated = deliverMessage(mb, msg)
    expect(updated.inbox).toHaveLength(1)
    expect(updated.inbox[0]).toBe(msg)
  })

  it('does not mutate the original mailbox', () => {
    const mb = emptyMailbox('bob')
    const msg = fakeMessage({ to: 'bob' })
    const updated = deliverMessage(mb, msg)
    expect(mb.inbox).toHaveLength(0)
    expect(updated.inbox).toHaveLength(1)
  })

  it('appends subsequent messages', () => {
    let mb = emptyMailbox('bob')
    mb = deliverMessage(mb, fakeMessage({ content: 'first' }))
    mb = deliverMessage(mb, fakeMessage({ content: 'second' }))
    expect(mb.inbox).toHaveLength(2)
    expect(mb.inbox[0].content).toBe('first')
    expect(mb.inbox[1].content).toBe('second')
  })

  it('prunes oldest read messages when over capacity', () => {
    const maxMessages = 3
    let mb = emptyMailbox('bob', maxMessages)

    // Deliver 3 read messages
    for (let i = 0; i < 3; i++) {
      const msg = fakeMessage({
        content: `old-${i}`,
        read: true,
        timestamp: new Date(2025, 0, i + 1).toISOString(),
      })
      mb = deliverMessage(mb, msg)
    }
    expect(mb.inbox).toHaveLength(3)

    // Deliver a 4th — should trigger prune, dropping the oldest read
    const newMsg = fakeMessage({
      content: 'new',
      read: false,
      timestamp: new Date(2025, 0, 10).toISOString(),
    })
    mb = deliverMessage(mb, newMsg)
    expect(mb.inbox.length).toBeLessThanOrEqual(maxMessages)
    // The new unread message must survive
    expect(mb.inbox.some((m) => m.content === 'new')).toBe(true)
  })

  it('keeps unread messages when pruning', () => {
    const maxMessages = 2
    let mb = emptyMailbox('bob', maxMessages)

    // Two unread messages
    const m1 = fakeMessage({
      content: 'unread-1',
      read: false,
      timestamp: new Date(2025, 0, 1).toISOString(),
    })
    const m2 = fakeMessage({
      content: 'unread-2',
      read: false,
      timestamp: new Date(2025, 0, 2).toISOString(),
    })
    mb = deliverMessage(mb, m1)
    mb = deliverMessage(mb, m2)

    // Deliver a 3rd unread — prune keeps newest unread
    const m3 = fakeMessage({
      content: 'unread-3',
      read: false,
      timestamp: new Date(2025, 0, 3).toISOString(),
    })
    mb = deliverMessage(mb, m3)
    expect(mb.inbox.length).toBeLessThanOrEqual(maxMessages)
    // All remaining should be unread
    expect(mb.inbox.every((m) => !m.read)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// deliverBroadcast
// ---------------------------------------------------------------------------

describe('deliverBroadcast', () => {
  it('delivers to all mailboxes except the sender', () => {
    const mailboxes = [
      emptyMailbox('alice'),
      emptyMailbox('bob'),
      emptyMailbox('charlie'),
    ]
    const broadcast = fakeMessage({
      from: 'alice',
      to: 'all',
      type: 'broadcast',
      content: 'team update',
    })

    const updated = deliverBroadcast(mailboxes, broadcast)
    // Alice (the sender) should have no messages
    expect(updated.find((mb) => mb.agentId === 'alice')!.inbox).toHaveLength(0)
    // Bob and Charlie should each have 1
    expect(updated.find((mb) => mb.agentId === 'bob')!.inbox).toHaveLength(1)
    expect(updated.find((mb) => mb.agentId === 'charlie')!.inbox).toHaveLength(1)
  })

  it('personalizes the to field for each recipient', () => {
    const mailboxes = [emptyMailbox('sender'), emptyMailbox('receiver')]
    const broadcast = fakeMessage({ from: 'sender', type: 'broadcast' })

    const updated = deliverBroadcast(mailboxes, broadcast)
    const receiverMb = updated.find((mb) => mb.agentId === 'receiver')!
    expect(receiverMb.inbox[0].to).toBe('receiver')
  })

  it('returns mailboxes in the same order', () => {
    const mailboxes = [
      emptyMailbox('z-agent'),
      emptyMailbox('a-agent'),
      emptyMailbox('m-agent'),
    ]
    const broadcast = fakeMessage({ from: 'external', type: 'broadcast' })

    const updated = deliverBroadcast(mailboxes, broadcast)
    expect(updated.map((mb) => mb.agentId)).toEqual([
      'z-agent',
      'a-agent',
      'm-agent',
    ])
  })
})

// ---------------------------------------------------------------------------
// markRead / markAllRead
// ---------------------------------------------------------------------------

describe('markRead', () => {
  it('marks a specific message as read', () => {
    const msg = fakeMessage({ id: 'target-msg', read: false })
    let mb = emptyMailbox('bob')
    mb = deliverMessage(mb, msg)

    const updated = markRead(mb, 'target-msg')
    expect(updated.inbox[0].read).toBe(true)
  })

  it('does not affect other messages', () => {
    const m1 = fakeMessage({ id: 'msg-1', read: false })
    const m2 = fakeMessage({ id: 'msg-2', read: false })
    let mb = emptyMailbox('bob')
    mb = deliverMessage(mb, m1)
    mb = deliverMessage(mb, m2)

    const updated = markRead(mb, 'msg-1')
    expect(updated.inbox.find((m) => m.id === 'msg-1')!.read).toBe(true)
    expect(updated.inbox.find((m) => m.id === 'msg-2')!.read).toBe(false)
  })

  it('does not mutate original mailbox', () => {
    const msg = fakeMessage({ id: 'x', read: false })
    let mb = emptyMailbox('bob')
    mb = deliverMessage(mb, msg)

    markRead(mb, 'x')
    expect(mb.inbox[0].read).toBe(false)
  })
})

describe('markAllRead', () => {
  it('marks every message as read', () => {
    let mb = emptyMailbox('bob')
    mb = deliverMessage(mb, fakeMessage({ read: false }))
    mb = deliverMessage(mb, fakeMessage({ read: false }))
    mb = deliverMessage(mb, fakeMessage({ read: false }))

    const updated = markAllRead(mb)
    expect(updated.inbox.every((m) => m.read)).toBe(true)
  })

  it('handles empty inbox', () => {
    const mb = emptyMailbox('bob')
    const updated = markAllRead(mb)
    expect(updated.inbox).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// getUnread
// ---------------------------------------------------------------------------

describe('getUnread', () => {
  it('returns only unread messages', () => {
    let mb = emptyMailbox('bob')
    mb = deliverMessage(mb, fakeMessage({ id: 'r1', read: true }))
    mb = deliverMessage(mb, fakeMessage({ id: 'u1', read: false }))
    mb = deliverMessage(mb, fakeMessage({ id: 'r2', read: true }))
    mb = deliverMessage(mb, fakeMessage({ id: 'u2', read: false }))

    const unread = getUnread(mb)
    expect(unread).toHaveLength(2)
    expect(unread.every((m) => !m.read)).toBe(true)
  })

  it('returns newest first', () => {
    let mb = emptyMailbox('bob')
    mb = deliverMessage(
      mb,
      fakeMessage({
        id: 'older',
        read: false,
        timestamp: '2025-01-01T00:00:00.000Z',
      }),
    )
    mb = deliverMessage(
      mb,
      fakeMessage({
        id: 'newer',
        read: false,
        timestamp: '2025-06-01T00:00:00.000Z',
      }),
    )

    const unread = getUnread(mb)
    expect(unread[0].id).toBe('newer')
    expect(unread[1].id).toBe('older')
  })

  it('returns empty array when all are read', () => {
    let mb = emptyMailbox('bob')
    mb = deliverMessage(mb, fakeMessage({ read: true }))
    expect(getUnread(mb)).toHaveLength(0)
  })

  it('returns empty array for empty inbox', () => {
    expect(getUnread(emptyMailbox('bob'))).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// mailboxToPromptFragment
// ---------------------------------------------------------------------------

describe('mailboxToPromptFragment', () => {
  it('returns empty string when no unread messages', () => {
    const mb = emptyMailbox('bob')
    expect(mailboxToPromptFragment(mb)).toBe('')
  })

  it('includes TEAM MESSAGES header', () => {
    let mb = emptyMailbox('bob')
    mb = deliverMessage(mb, fakeMessage({ read: false, content: 'sup' }))

    const fragment = mailboxToPromptFragment(mb)
    expect(fragment).toContain('## TEAM MESSAGES')
  })

  it('shows unread count', () => {
    let mb = emptyMailbox('bob')
    mb = deliverMessage(mb, fakeMessage({ read: false }))
    mb = deliverMessage(mb, fakeMessage({ read: false }))

    const fragment = mailboxToPromptFragment(mb)
    expect(fragment).toContain('2 unread messages')
  })

  it('uses singular for 1 unread message', () => {
    let mb = emptyMailbox('bob')
    mb = deliverMessage(mb, fakeMessage({ read: false }))

    const fragment = mailboxToPromptFragment(mb)
    expect(fragment).toContain('1 unread message')
    expect(fragment).not.toContain('1 unread messages')
  })

  it('resolves sender names via agentNames map', () => {
    let mb = emptyMailbox('bob')
    mb = deliverMessage(
      mb,
      fakeMessage({ from: 'agent-x', read: false, content: 'hey' }),
    )

    const fragment = mailboxToPromptFragment(mb, { 'agent-x': 'Xavier' })
    expect(fragment).toContain('Xavier')
  })

  it('falls back to agent id when no name map provided', () => {
    let mb = emptyMailbox('bob')
    mb = deliverMessage(
      mb,
      fakeMessage({ from: 'agent-x', read: false, content: 'hey' }),
    )

    const fragment = mailboxToPromptFragment(mb)
    expect(fragment).toContain('agent-x')
  })

  it('includes message type labels', () => {
    let mb = emptyMailbox('bob')
    mb = deliverMessage(
      mb,
      fakeMessage({ type: 'design_handoff', read: false }),
    )

    const fragment = mailboxToPromptFragment(mb)
    expect(fragment).toContain('[Handoff]')
  })

  it('truncates message content at 200 chars', () => {
    let mb = emptyMailbox('bob')
    const longContent = 'x'.repeat(300)
    mb = deliverMessage(mb, fakeMessage({ read: false, content: longContent }))

    const fragment = mailboxToPromptFragment(mb)
    // The fragment should not contain the full 300-char string
    expect(fragment).not.toContain(longContent)
    // But it should contain a 200-char slice
    expect(fragment).toContain('x'.repeat(200))
  })

  it('shows overflow notice when more than 5 unread', () => {
    let mb = emptyMailbox('bob')
    for (let i = 0; i < 7; i++) {
      mb = deliverMessage(
        mb,
        fakeMessage({
          read: false,
          timestamp: new Date(2025, 0, i + 1).toISOString(),
        }),
      )
    }

    const fragment = mailboxToPromptFragment(mb)
    expect(fragment).toContain('...and 2 more unread messages')
  })

  it('does not show overflow notice when exactly 5 unread', () => {
    let mb = emptyMailbox('bob')
    for (let i = 0; i < 5; i++) {
      mb = deliverMessage(mb, fakeMessage({ read: false }))
    }

    const fragment = mailboxToPromptFragment(mb)
    expect(fragment).not.toContain('more unread')
  })
})
