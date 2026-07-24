import { useEffect, useRef, useState } from 'react'
import MonacoEditor from '@monaco-editor/react'
import type { CodeMarker } from '@/types'

type Props = {
    value: string
    onChange: (value: string) => void
    onCursorChange?: (line: number, column: number) => void
    markers?: CodeMarker[]
    fontSize?: number
    tabSize?: number
    wordWrap?: 'off' | 'on'
}

export default function Editor({ value, onChange, onCursorChange, markers, fontSize = 14, tabSize = 2, wordWrap = 'off' }: Props) {
    const [editorInstance, setEditorInstance] = useState<unknown>(null)
    const decorationIdsRef = useRef<string[]>([])
    const isInternalChange = useRef(false)

    const handleEditorMount = (monacoEditor: unknown) => {
        setEditorInstance(monacoEditor)
    }

    useEffect(() => {
        if (!editorInstance || !onCursorChange) return

        const disposable = (editorInstance as { onDidChangeCursorPosition: (cb: (e: { position: { lineNumber: number; column: number } }) => void) => { dispose: () => void } }).onDidChangeCursorPosition((e) => {
            onCursorChange(e.position.lineNumber, e.position.column)
        })

        return () => disposable.dispose()
    }, [editorInstance, onCursorChange])

    useEffect(() => {
        if (!editorInstance) return

        const editor = editorInstance as { deltaDecorations: (old: string[], newDecorations: { range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number }; options: { isWholeLine: boolean; className: string; hoverMessage?: { value: string } } }[]) => string[] }

        const newDecorations = (markers ?? []).map(m => ({
            range: {
                startLineNumber: m.line,
                startColumn: 1,
                endLineNumber: m.line,
                endColumn: 1,
            },
            options: {
                isWholeLine: true,
                className: `marker-${m.severity}`,
                hoverMessage: { value: `[${m.source}] ${m.message}` },
            },
        }))

        decorationIdsRef.current = editor.deltaDecorations(decorationIdsRef.current, newDecorations)
    }, [editorInstance, markers])

    useEffect(() => {
        if (!editorInstance) return

        if (isInternalChange.current) {
            isInternalChange.current = false
            return
        }

        const editor = editorInstance as { getValue: () => string; setValue: (v: string) => void }
        if (editor.getValue() !== value) {
            editor.setValue(value)
        }
    }, [value, editorInstance])

    const handleChange = (v: string | undefined) => {
        isInternalChange.current = true
        onChange(v ?? '')
    }

    return (
        <MonacoEditor
            height="100%"
            language='c'
            defaultValue={value}
            onChange={handleChange}
            theme='vs-dark'
            options={{ fontSize, tabSize, wordWrap, minimap: { enabled: false } }}
            onMount={handleEditorMount}
        />
    )
}
