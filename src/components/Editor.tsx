import MonacoEditor from '@monaco-editor/react'

type Props = {
    value: string
    onChange: (value: string) => void
}

export default function Editor({value, onChange}: Props) {
    return(
        <MonacoEditor
            height="100%"
            language='c'
            value={value}
            onChange={(v) => onChange(v ?? '')}
            theme='vs-dark'
            options={{ fontSize: 14, minimap: { enabled: false} }}
        />
    )
}