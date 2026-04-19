import { beforeEach, describe, expect, it } from 'vitest'
import {
  registerAdapter,
  unregisterAdapter,
  resolveAdapter,
  listAdapters,
  clearAdapters,
  type TaskAdapter,
} from '../src/index'

const stubAdapter: TaskAdapter = {
  id: 'test:stub',
  name: 'Stub',
  version: '0.0.0',
  async executeTask() {
    return { outcome: 'done', summary: 'ok' }
  },
}

describe('adapter registry', () => {
  beforeEach(() => {
    clearAdapters()
  })

  it('registers and resolves an adapter by id', () => {
    registerAdapter(stubAdapter)
    expect(resolveAdapter('test:stub')).toBe(stubAdapter)
  })

  it('resolveAdapter returns null for unknown ids', () => {
    expect(resolveAdapter('nope')).toBeNull()
  })

  it('listAdapters returns every registered adapter', () => {
    registerAdapter(stubAdapter)
    const other: TaskAdapter = { ...stubAdapter, id: 'test:other' }
    registerAdapter(other)
    const ids = listAdapters().map((a) => a.id).sort()
    expect(ids).toEqual(['test:other', 'test:stub'])
  })

  it('unregisterAdapter removes by id', () => {
    registerAdapter(stubAdapter)
    unregisterAdapter('test:stub')
    expect(resolveAdapter('test:stub')).toBeNull()
  })

  it('rejects adapters without an id', () => {
    expect(() => registerAdapter({ ...stubAdapter, id: '' })).toThrow(/id/)
  })

  it('rejects adapters without executeTask', () => {
    const broken = { id: 'test:broken', name: 'x', version: '0' } as unknown as TaskAdapter
    expect(() => registerAdapter(broken)).toThrow(/executeTask/)
  })

  it('re-registering replaces the previous entry', () => {
    registerAdapter(stubAdapter)
    const replacement: TaskAdapter = { ...stubAdapter, name: 'Replaced' }
    registerAdapter(replacement)
    expect(resolveAdapter('test:stub')?.name).toBe('Replaced')
  })
})
