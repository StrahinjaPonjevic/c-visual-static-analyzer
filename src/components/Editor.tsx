import { useEffect, useRef, useState, useMemo } from 'react'
import MonacoEditor, { type OnMount } from '@monaco-editor/react'
import type { CodeMarker } from '@/types'
import { useTranslation } from '@/i18n/LanguageContext'

type MonacoEditorInstance = Parameters<OnMount>[0]

type Props = {
    value: string
    onChange: (value: string) => void
    onCursorChange?: (line: number, column: number) => void
    onExplainWithAi?: (line: number, lineContent: string) => void
    onDropFilePath?: (filePath: string) => void
    onMount?: (editor: MonacoEditorInstance) => void
    markers?: CodeMarker[]
    fontSize?: number
    tabSize?: number
    wordWrap?: 'off' | 'on'
    filePath?: string | null
    theme?: string
}

export default function Editor({
    value,
    onChange,
    onCursorChange,
    onExplainWithAi,
    onDropFilePath,
    onMount,
    markers,
    fontSize = 14,
    tabSize = 2,
    wordWrap = 'off',
    filePath,
    theme = 'vs-dark',
}: Props) {
    const { t } = useTranslation()
    const [editorInstance, setEditorInstance] = useState<MonacoEditorInstance | null>(null)
    const decorationIdsRef = useRef<string[]>([])
    const onExplainWithAiRef = useRef(onExplainWithAi)
    onExplainWithAiRef.current = onExplainWithAi

    const handleEditorMount: OnMount = (monacoEditor) => {
        setEditorInstance(monacoEditor)
        onMount?.(monacoEditor)

        monacoEditor.addAction({
            id: 'explain-line-with-ai',
            label: t("editor.explainLineWithAi"),
            contextMenuGroupId: 'navigation',
            contextMenuOrder: 1.5,
            run: (ed) => {
                const pos = ed.getPosition()
                const line = pos ? pos.lineNumber : 1
                const model = ed.getModel()
                const lineContent = model ? model.getLineContent(line) : ''
                onExplainWithAiRef.current?.(line, lineContent)
            },
        })
    }

    useEffect(() => {
        if (!editorInstance || !onCursorChange) return

        const disposable = editorInstance.onDidChangeCursorPosition((e) => {
            onCursorChange(e.position.lineNumber, e.position.column)
        })

        return () => disposable.dispose()
    }, [editorInstance, onCursorChange])

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
    }, [editorInstance, markers])

    const handleChange = (v: string | undefined) => {
        onChange(v ?? '')
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        if (!onDropFilePath) return
        const files = Array.from(e.dataTransfer.files)
        const codeFile = files.find(f =>
            f.name.endsWith('.c') ||
            f.name.endsWith('.h') ||
            f.name.endsWith('.cpp') ||
            f.name.endsWith('.hpp') ||
            f.name.endsWith('.txt')
        )
        if (codeFile && (codeFile as File & { path?: string }).path) {
            onDropFilePath((codeFile as File & { path: string }).path)
        }
    }

    const language = filePath?.endsWith('.h') || filePath?.endsWith('.hpp') ? 'c' : 'c'
    const normalizedValue = useMemo(() => (value || '').replace(/\r\n/g, '\n'), [value])

    return (
        <div className="w-full h-full relative" onDragOver={handleDragOver} onDrop={handleDrop}>
            <MonacoEditor
                key={filePath || 'default'}
                height="100%"
                language={language}
                defaultValue={normalizedValue}
                onChange={handleChange}
                theme={theme}
                options={{ fontSize, tabSize, wordWrap, minimap: { enabled: false } }}
                onMount={handleEditorMount}
            />
        </div>
    )
}
