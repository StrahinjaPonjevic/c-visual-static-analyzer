import { useRef, useEffect, useState } from 'react'
import MonacoEditor from '@monaco-editor/react'

type Props = {
    value: string
    onChange: (value: string) => void
    onCursorChange?: (line: number, column: number) => void
}

export default function Editor({ value, onChange, onCursorChange }: Props) {
    const editorRef = useRef<unknown>(null)
    const [editorInstance, setEditorInstance] = useState<unknown>(null)

    // Store editor instance when mounted
    const handleEditorMount = (monacoEditor: unknown) => {
        console.log('[Editor] onMount, editor:', monacoEditor)
        setEditorInstance(monacoEditor)
    }

    // Set up cursor listener when editor is ready
    useEffect(() => {
        if (!editorInstance || !onCursorChange) return

        console.log('[Editor] Adding cursor listener to:', editorInstance)
        const disposable = (editorInstance as { onDidChangeCursorPosition: (cb: (e: { position: { lineNumber: number; column: number } }) => void) => { dispose: () => void } }).onDidChangeCursorPosition((e) => {
            onCursorChange(e.position.lineNumber, e.position.column)
        })

        return () => disposable.dispose()
    }, [editorInstance, onCursorChange])

    return (
        <MonacoEditor
            ref={editorRef}
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