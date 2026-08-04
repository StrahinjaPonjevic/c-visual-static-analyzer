import { describe, it, expect } from 'vitest'
import { parseCppcheckXml, parseGccErrors, computeMetrics, stripCommentsAndStrings, extractCallGraph } from './parsers'

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

  it('parses error with shuffled attributes order (severity before id)', () => {
    const xml = `<?xml version="1.0"?>
<results>
<error severity="error" cwe="457" id="uninitvar" msg="Uninitialized variable: y">
  <location file="main.c" line="12" column="4"/>
</error>
</results>`
    const issues = parseCppcheckXml(xml)
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({
      id: 'uninitvar',
      severity: 'error',
      message: 'Uninitialized variable: y',
      cwe: 457,
      line: 12,
      column: 4,
      filePath: 'main.c',
    })
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

  it('parses GCC fatal error', () => {
    const stderr = 'test.c:2:1: fatal error: stdio.h: No such file or directory'
    const errors = parseGccErrors(stderr)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatchObject({
      line: 2,
      column: 1,
      type: 'error',
      message: 'stdio.h: No such file or directory',
    })
  })

  it('parses GCC error without column number', () => {
    const stderr = 'test.c:15: error: missing semicolon'
    const errors = parseGccErrors(stderr)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatchObject({
      line: 15,
      column: 0,
      type: 'error',
      message: 'missing semicolon',
    })
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

describe('computeMetrics', () => {
  it('strips single line comments', () => {
    const code = 'int x = 5; // for (int i=0; i<10; i++) malloc(10);'
    const stripped = stripCommentsAndStrings(code)
    expect(stripped).not.toContain('malloc')
    expect(stripped).not.toContain('for')
  })

  it('strips multiline comments', () => {
    const code = '/* while (1) { char *ptr = malloc(100); free(ptr); } */ int main() {}'
    const metrics = computeMetrics(code)
    expect(metrics.loops).toBe(0)
    expect(metrics.mallocCalls).toBe(0)
    expect(metrics.freeCalls).toBe(0)
  })

  it('strips keywords in string literals', () => {
    const code = 'char msg[] = "for while do malloc free struct int *p";'
    const metrics = computeMetrics(code)
    expect(metrics.loops).toBe(0)
    expect(metrics.mallocCalls).toBe(0)
    expect(metrics.freeCalls).toBe(0)
    expect(metrics.pointers).toBe(0)
    expect(metrics.structs).toBe(0)
  })

  it('correctly calculates metrics for genuine C code', () => {
    const code = `#include <stdio.h>
#include <stdlib.h>

// Ovo je komentar
int main() {
    int *ptr = (int *)malloc(sizeof(int) * 10);
    for (int i = 0; i < 10; i++) {
        if (i > 5) {
            printf("ok");
        }
    }
    free(ptr);
    return 0;
}`
    const metrics = computeMetrics(code)
    expect(metrics.functions).toBe(1)
    expect(metrics.loops).toBe(1)
    expect(metrics.ifStatements).toBe(1)
    expect(metrics.mallocCalls).toBe(1)
    expect(metrics.freeCalls).toBe(1)
    expect(metrics.pointers).toBe(1)
    expect(metrics.includes).toBe(2)
    expect(metrics.comments).toBe(1)
    expect(metrics.cyclomaticComplexity).toBe(3) // 1 + for + if
    expect(metrics.memoryLeakRisk).toBe(false)
  })

  it('detects memory leak risk when malloc > free', () => {
    const code = 'int main() { char *p = malloc(10); return 0; }'
    const metrics = computeMetrics(code)
    expect(metrics.mallocCalls).toBe(1)
    expect(metrics.freeCalls).toBe(0)
    expect(metrics.memoryLeakRisk).toBe(true)
  })
})

describe('extractCallGraph', () => {
  it('extracts function call graph nodes and relations correctly', () => {
    const code = `
void helper() {
    printf("helper\\n");
}

void foo() {
    helper();
}

int main() {
    foo();
    return 0;
}
`
    const graph = extractCallGraph(code)
    expect(graph).toHaveLength(3)

    const helperNode = graph.find(n => n.name === 'helper')
    const fooNode = graph.find(n => n.name === 'foo')
    const mainNode = graph.find(n => n.name === 'main')

    expect(helperNode?.calls).toEqual([])
    expect(fooNode?.calls).toEqual(['helper'])
    expect(mainNode?.calls).toEqual(['foo'])
  })
})

