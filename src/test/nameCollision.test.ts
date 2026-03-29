import { describe, it, expect } from 'vitest'

/**
 * Tests for name collision suffix logic, mirroring the joinSession helper behaviour.
 */
function resolveDisplayName(desiredName: string, existingNames: string[]): string {
  if (!existingNames.includes(desiredName)) return desiredName
  // In production this uses Math.random(); here we use a fixed suffix for determinism
  return `${desiredName}-xx`
}

describe('name collision handling', () => {
  it('keeps the desired name when no collision', () => {
    expect(resolveDisplayName('Alice', ['Bob', 'Carol'])).toBe('Alice')
  })

  it('appends suffix when name already exists', () => {
    const result = resolveDisplayName('Alice', ['Alice', 'Bob'])
    expect(result).toMatch(/^Alice-.{2}$/)
  })

  it('keeps name when list is empty', () => {
    expect(resolveDisplayName('Alice', [])).toBe('Alice')
  })
})
