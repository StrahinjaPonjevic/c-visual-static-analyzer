export interface AppSettings {
  llm: {
    ollamaUrl: string
    model: string
  }
  compiler: {
    cStandard: string
    extraFlags: string
  }
  cppcheck: {
    autoAnalyze: boolean
    debounceMs: number
    extraFlags: string
  }
  editor: {
    fontSize: number
    tabSize: number
    wordWrap: 'off' | 'on'
  }
}

export const DEFAULT_SETTINGS: AppSettings = {
  llm: {
    ollamaUrl: 'http://localhost:11434',
    model: 'gemma4:e4b',
  },
  compiler: {
    cStandard: 'c11',
    extraFlags: '',
  },
  cppcheck: {
    autoAnalyze: true,
    debounceMs: 600,
    extraFlags: '',
  },
  editor: {
    fontSize: 14,
    tabSize: 2,
    wordWrap: 'off',
  },
}
