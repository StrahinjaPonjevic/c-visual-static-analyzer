import { describe, it, expect } from 'vitest'
import { stripCommentsAndStrings } from './utils'

describe('stripCommentsAndStrings', () => {
  it('removes single-line comments', () => {
    const result = stripCommentsAndStrings('int x = 5; // this is a comment\nreturn x;')
    expect(result).not.toContain('this is a comment')
    expect(result).toContain('int x = 5;')
    expect(result).toContain('return x;')
  })

  it('removes multi-line comments', () => {
    const result = stripCommentsAndStrings('/* multi\nline\ncomment */ int x;')
    expect(result).not.toContain('multi')
    expect(result).not.toContain('comment')
    expect(result).toContain('int x;')
  })

  it('preserves newlines inside multi-line comments', () => {
    const input = '/*\ncomment\n*/\nint x;'
    const result = stripCommentsAndStrings(input)
    expect(result.split('\n').length).toBe(4)
  })

  it('replaces string literals with a single space', () => {
    const result = stripCommentsAndStrings('printf("hello world");')
    expect(result).toBe('printf( );')
  })

  it('replaces char literals with a single space', () => {
    const result = stripCommentsAndStrings("char c = 'x';")
    expect(result).toBe('char c =  ;')
  })

  it('handles escaped characters in strings', () => {
    const result = stripCommentsAndStrings('printf("hello \\"world\\"");')
    expect(result).toBe('printf( );')
  })

  it('returns original string when there are no comments or strings', () => {
    const input = 'int x = 5;'
    expect(stripCommentsAndStrings(input)).toBe(input)
  })

  it('handles empty string', () => {
    expect(stripCommentsAndStrings('')).toBe('')
  })

  it('handles consecutive string literals', () => {
    const result = stripCommentsAndStrings('printf("a"); printf("b");')
    expect(result).toBe('printf( ); printf( );')
  })
})
