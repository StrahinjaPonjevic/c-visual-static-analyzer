import { describe, it, expect } from 'vitest'
import { parseCppcheckXml, parseGccErrors } from './parsers'

describe('parseCppcheckXml', () => {
  it('parses a basic error', () => {
    const xml = `<?xml version="1.0"?>
<results>
<error id="uninitvar" severity="error" msg="Uninitialized variable: x">
  <location file="test.c" line="5" column="10"/>
</error>
</results>`
    const issues = parseCppcheckXml(xml)
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({
      id: 'uninitvar',
      severity: 'error',
      message: 'Uninitialized variable: x',
      line: 5,
      column: 10,
    })
  })

  it('parses multiple errors', () => {
    const xml = `<?xml version="1.0"?>
<results>
<error id="id1" severity="warning" msg="Warning 1">
  <location file="test.c" line="1" column="1"/>
</error>
<error id="id2" severity="style" msg="Style issue">
  <location file="test.c" line="2" column="5"/>
</error>
</results>`
    const issues = parseCppcheckXml(xml)
    expect(issues).toHaveLength(2)
  })

  it('skips missingIncludeSystem and checkersReport', () => {
    const xml = `<?xml version="1.0"?>
<results>
<error id="missingIncludeSystem" severity="information" msg="Include not found">
  <location file="test.c" line="1" column="1"/>
</error>
<error id="checkersReport" severity="information" msg="Checkers report">
  <location file="test.c" line="2" column="1"/>
</error>
<error id="uninitvar" severity="error" msg="Real error">
  <location file="test.c" line="3" column="1"/>
</error>
</results>`
    const issues = parseCppcheckXml(xml)
    expect(issues).toHaveLength(1)
    expect(issues[0].id).toBe('uninitvar')
  })

  it('decodes XML entities in message', () => {
    const xml = `<?xml version="1.0"?>
<results>
<error id="syntax" severity="error" msg="x &lt; y &amp;&amp; z &gt; 5">
  <location file="test.c" line="1" column="1"/>
</error>
</results>`
    const issues = parseCppcheckXml(xml)
    expect(issues[0].message).toBe('x < y && z > 5')
  })

  it('parses error with CWE', () => {
    const xml = `<?xml version="1.0"?>
<results>
<error id="bufferOverflow" severity="error" msg="Buffer overflow" cwe="121">
  <location file="test.c" line="10" column="3"/>
</error>
</results>`
    const issues = parseCppcheckXml(xml)
    expect(issues[0].cwe).toBe(121)
  })

  it('returns empty array for empty XML', () => {
    expect(parseCppcheckXml('')).toEqual([])
  })

  it('returns empty array for XML with no errors', () => {
    const xml = '<?xml version="1.0"?><results></results>'
    expect(parseCppcheckXml(xml)).toEqual([])
  })

  it('handles error with missing column', () => {
    const xml = `<?xml version="1.0"?>
<results>
<error id="uninitvar" severity="error" msg="x">
  <location file="test.c" line="5"/>
</error>
</results>`
    const issues = parseCppcheckXml(xml)
    expect(issues[0].column).toBe(0)
  })
})

describe('parseGccErrors', () => {
  it('parses a basic GCC error', () => {
    const stderr = 'test.c:5:10: error: expected \';\' before \'return\''
    const errors = parseGccErrors(stderr)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatchObject({
      line: 5,
      column: 10,
      type: 'error',
      message: "expected ';' before 'return'",
    })
  })

  it('parses a GCC warning', () => {
    const stderr = 'test.c:3:8: warning: unused variable \'x\''
    const errors = parseGccErrors(stderr)
    expect(errors).toHaveLength(1)
    expect(errors[0].type).toBe('warning')
  })

  it('parses multiple errors', () => {
    const stderr = [
      'test.c:1:1: error: error one',
      'test.c:2:2: warning: warning two',
    ].join('\n')
    const errors = parseGccErrors(stderr)
    expect(errors).toHaveLength(2)
  })

  it('handles Windows paths', () => {
    const stderr = 'C:\\Users\\test\\file.c:10:5: error: syntax error'
    const errors = parseGccErrors(stderr)
    expect(errors).toHaveLength(1)
    expect(errors[0].line).toBe(10)
    expect(errors[0].filePath).toBe('C:\\Users\\test\\file.c')
  })

  it('parses errors across multiple different files', () => {
    const stderr = [
      'src/main.c:5:10: error: error in main',
      'src/utils.c:20:2: warning: warning in utils',
    ].join('\n')
    const errors = parseGccErrors(stderr)
    expect(errors).toHaveLength(2)
    expect(errors[0].filePath).toBe('src/main.c')
    expect(errors[1].filePath).toBe('src/utils.c')
  })

  it('ignores non-GCC output', () => {
    const stderr = 'Some random output\nNot a gcc error here'
    expect(parseGccErrors(stderr)).toEqual([])
  })

  it('returns empty array for empty string', () => {
    expect(parseGccErrors('')).toEqual([])
  })
})
