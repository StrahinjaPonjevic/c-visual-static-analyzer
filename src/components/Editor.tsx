import { useEffect, useState } from 'react'
import MonacoEditor from '@monaco-editor/react'

type Props = {
    value: string
    onChange: (value: string) => void
    onCursorChange?: (line: number, column: number) => void
}

export default function Editor({ value, onChange, onCursorChange }: Props) {
    const [editorInstance, setEditorInstance] = useState<unknown>(null)

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

    return (
        <MonacoEditor
            height="100%"
            language='c'
            value={value}
            onChange={(v) => onChange(v ?? '')}
            theme='vs-dark'
            options={{ fontSize: 14, minimap: { enabled: false } }}
            onMount={handleEditorMount}
        />
    )
}