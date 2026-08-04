import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
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

let globalCodeActionDisposable: { dispose: () => void } | null = null
let isCommandRegistered = false

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

    const tRef = useRef(t)
    tRef.current = t

    const markersRef = useRef(markers)
    markersRef.current = markers

    const monacoRef = useRef<Parameters<OnMount>[1] | null>(null)

    const registerProvider = useCallback((monaco: Parameters<OnMount>[1]) => {
        if (!isCommandRegistered) {
            try {
                monaco.editor.registerCommand('explain-line-with-ai-cmd', (_accessor: unknown, line: number, lineContent: string) => {
                    onExplainWithAiRef.current?.(line, lineContent)
                })
                isCommandRegistered = true
            } catch {
                // Command already registered
            }
        }

        if (globalCodeActionDisposable) {
            globalCodeActionDisposable.dispose()
            globalCodeActionDisposable = null
        }

        globalCodeActionDisposable = monaco.languages.registerCodeActionProvider('c', {
            provideCodeActions: (
                model: { getLineContent: (l: number) => string },
                range: { startLineNumber: number },
                context: { markers: readonly unknown[] }
            ) => {
                const line = range.startLineNumber
                const lineContent = model.getLineContent(line)
                const issueOnLine = markersRef.current && markersRef.current.find(m => m.line === line)
                const hasIssue = context.markers.length > 0 || !!issueOnLine

                if (!hasIssue) {
                    return { actions: [], dispose: () => {} }
                }

                const actionTitle = tRef.current("editor.explainLineWithAi")

                return {
                    actions: [
                        {
                            title: actionTitle,
                            kind: 'quickfix',
                            diagnostics: context.markers as never[],
                            isPreferred: true,
                            command: {
                                id: 'explain-line-with-ai-cmd',
                                title: actionTitle,
                                arguments: [line, lineContent],
                            },
                        },
                    ],
                    dispose: () => {},
                }
            },
        })
    }, [])

    const handleEditorMount: OnMount = (monacoEditor, monaco) => {
        setEditorInstance(monacoEditor)
        monacoRef.current = monaco
        onMount?.(monacoEditor)

        registerProvider(monaco)

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

        const model = editorInstance.getModel()
        const monaco = monacoRef.current

        if (model && monaco) {
            const monacoMarkers = (markers ?? []).map((m) => ({
                startLineNumber: m.line,
                startColumn: m.column || 1,
                endLineNumber: m.line,
                endColumn: m.column ? m.column + 5 : 100,
                message: `[${m.source.toUpperCase()}] ${m.message}`,
                severity: m.severity === 'error'
                    ? monaco.MarkerSeverity.Error
                    : m.severity === 'warning'
                        ? monaco.MarkerSeverity.Warning
                        : monaco.MarkerSeverity.Info,
            }))
            monaco.editor.setModelMarkers(model, 'c-analyzer', monacoMarkers)
        }

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
                options={{
                    fontSize,
                    tabSize,
                    wordWrap,
                    minimap: { enabled: false },
                    lightbulb: { enabled: 'on' as never },
                    glyphMargin: true,
                }}
                onMount={handleEditorMount}
            />
        </div>
    )
}
