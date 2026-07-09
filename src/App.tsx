import { useState, useEffect } from 'react'
import Editor from './components/Editor'
import './App.css'

function App() {
  const [code, setCode] = useState('// Otvorite C fajl da biste poceli\n')

  useEffect(() => {
    const cleanup = window.api.onMenuOpen(async () => {
      const result = await window.api.openFile()
      if(result) {
        setCode(result.content)
      }
    })
    return cleanup
  }, [])

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
