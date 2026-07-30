import { useEffect, useRef, useState, useMemo } from 'react'
import MonacoEditor, { type OnMount } from '@monaco-editor/react'
import type { CodeMarker } from '@/types'

type MonacoEditorInstance = Parameters<OnMount>[0]

type Props = {
    value: string
    onChange: (value: string) => void
    onCursorChange?: (line: number, column: number) => void
    markers?: CodeMarker[]
    fontSize?: number
    tabSize?: number
    wordWrap?: 'off' | 'on'
    filePath?: string | null
}

export default function Editor({ value, onChange, onCursorChange, markers, fontSize = 14, tabSize = 2, wordWrap = 'off', filePath }: Props) {
    const [editorInstance, setEditorInstance] = useState<MonacoEditorInstance | null>(null)
    const decorationIdsRef = useRef<string[]>([])

    const handleEditorMount: OnMount = (monacoEditor) => {
        setEditorInstance(monacoEditor)
    }

    useEffect(() => {
        if (!editorInstance || !onCursorChange) return

        const disposable = editorInstance.onDidChangeCursorPosition((e) => {
            onCursorChange(e.position.lineNumber, e.position.column)
        })

        return () => disposable.dispose()
    }, [editorInstance, onCursorChange])

    const markersKey = useMemo(() => JSON.stringify(markers ?? []), [markers])

    useEffect(() => {
        if (!editorInstance) return

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

        decorationIdsRef.current = editorInstance.deltaDecorations(decorationIdsRef.current, newDecorations)
    }, [editorInstance, markersKey])

    const handleChange = (v: string | undefined) => {
        onChange(v ?? '')
    }

    const language = filePath?.endsWith('.h') || filePath?.endsWith('.hpp') ? 'c' : 'c'
    const normalizedValue = useMemo(() => (value || '').replace(/\r\n/g, '\n'), [value])

    return (
        <MonacoEditor
            key={filePath || 'default'}
            height="100%"
            language={language}
            defaultValue={normalizedValue}
            onChange={handleChange}
            theme='vs-dark'
            options={{ fontSize, tabSize, wordWrap, minimap: { enabled: false } }}
            onMount={handleEditorMount}
        />
    )
}
