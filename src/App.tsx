import { useState, useEffect } from 'react'
import Editor from './components/Editor'
import './App.css'

function App() {
  const [code, setCode] = useState('// Otvorite C fajl da biste poceli\n')
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null)

  useEffect(() => {
    const cleanup = window.api.onMenuOpen(async () => {
      const result = await window.api.openFile()
      if(result) {
        setCode(result.content)
        setCurrentFilePath(result.filePath)
      }
    })
    return cleanup
  }, [])

  async function handleSave() {
    if(currentFilePath) {
      await window.api.saveFile(currentFilePath, code)
    }
  }

  useEffect(() => {
    const cleanup = window.api.onMenuSave(() => {
      handleSave()
    })
    return cleanup
  }, [currentFilePath, code])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [currentFilePath, code])

  return (
    <div className="app-shell">
      <main className="editor-area">
        <Editor value={code} onChange={setCode}/>
      </main>
      <aside className="ai-panel">{}</aside>
      <footer className="output-panel">{}</footer>
    </div>
  )
}

export default App
