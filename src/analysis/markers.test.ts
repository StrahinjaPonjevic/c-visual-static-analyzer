import { describe, it, expect } from 'vitest'
import { computeMarkers } from './markers'
import type { CppcheckIssue, GccError } from '@/types'

describe('computeMarkers', () => {
  it('maps cppcheck issues to markers', () => {
    const issues: CppcheckIssue[] = [
      { id: 'uninitvar', severity: 'error', message: 'x is uninitialized', line: 5, column: 10 },
    ]
    const markers = computeMarkers('', issues, [])
    expect(markers).toHaveLength(1)
    expect(markers[0]).toMatchObject({
      line: 5,
      column: 10,
      severity: 'error',
      source: 'cppcheck',
    })
  })

  it('maps GCC errors to markers', () => {
    const errors: GccError[] = [
      { line: 3, column: 8, type: 'warning', message: 'unused variable' },
    ]
    const markers = computeMarkers('', [], errors)
    expect(markers).toHaveLength(1)
    expect(markers[0]).toMatchObject({
      line: 3,
      column: 8,
      severity: 'warning',
      source: 'gcc',
    })
  })

  it('maps GCC errors as error severity', () => {
    const errors: GccError[] = [
      { line: 1, column: 1, type: 'error', message: 'syntax error' },
    ]
    const markers = computeMarkers('', [], errors)
    expect(markers[0].severity).toBe('error')
  })

  it('skips issues with line <= 0', () => {
    const issues: CppcheckIssue[] = [
      { id: 'x', severity: 'error', message: 'skip', line: 0, column: 0 },
    ]
    const markers = computeMarkers('', issues, [])
    expect(markers).toHaveLength(0)
  })

  it('skips GCC errors with line <= 0', () => {
    const errors: GccError[] = [
      { line: 0, column: 0, type: 'error', message: 'skip' },
    ]
    const markers = computeMarkers('', [], errors)
    expect(markers).toHaveLength(0)
  })

  it('produces metric markers for malloc without free', () => {
    const code = 'int *p = malloc(100);'
    const markers = computeMarkers(code, [], [])
    const mallocMarkers = markers.filter(m => m.source === 'metric')
    expect(mallocMarkers.length).toBeGreaterThan(0)
    expect(mallocMarkers[0].message).toContain('malloc')
  })

  it('produces metric markers for free without malloc', () => {
    const code = 'free(p);'
    const markers = computeMarkers(code, [], [])
    const freeMarkers = markers.filter(m => m.source === 'metric')
    expect(freeMarkers.length).toBeGreaterThan(0)
    expect(freeMarkers[0].message).toContain('free')
  })

  it('does not produce metric markers when both malloc and free exist', () => {
    const code = 'int *p = malloc(100);\nfree(p);'
    const markers = computeMarkers(code, [], [])
    const metricMarkers = markers.filter(m => m.source === 'metric')
    expect(metricMarkers).toHaveLength(0)
  })

  it('does not produce metric markers for variable names containing malloc or free (e.g. my_malloc)', () => {
    const code = 'int my_malloc = 5;\nint free_list = 10;'
    const markers = computeMarkers(code, [], [])
    const metricMarkers = markers.filter(m => m.source === 'metric')
    expect(metricMarkers).toHaveLength(0)
  })

  it('defaults to info severity for unknown cppcheck severities', () => {
    const issues: CppcheckIssue[] = [
      // @ts-expect-error testing runtime fallback for unknown severity
      { id: 'unknown', severity: 'unknown_sev', message: 'test', line: 4, column: 1 },
    ]
    const markers = computeMarkers('', issues, [])
    expect(markers).toHaveLength(1)
    expect(markers[0].severity).toBe('info')
  })

  it('combines all marker types', () => {
    const issues: CppcheckIssue[] = [
      { id: 'x', severity: 'warning', message: 'cppcheck', line: 1, column: 1 },
    ]
    const errors: GccError[] = [
      { line: 2, column: 2, type: 'error', message: 'gcc' },
    ]
    const code = 'int *p = malloc(100);'
    const markers = computeMarkers(code, issues, errors)
    const sources = new Set(markers.map(m => m.source))
    expect(sources.has('cppcheck')).toBe(true)
    expect(sources.has('gcc')).toBe(true)
    expect(sources.has('metric')).toBe(true)
  })
})
