import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs/promises'
import { AppSettings, DEFAULT_SETTINGS } from '../src/types/settings'

export type { AppSettings }
export const DEFAULTS = DEFAULT_SETTINGS

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json')
}

export async function loadSettings(): Promise<AppSettings> {
  const filePath = getSettingsPath()
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    const saved = JSON.parse(raw) as Partial<AppSettings>
    return {
      llm: { ...DEFAULTS.llm, ...saved.llm },
      compiler: { ...DEFAULTS.compiler, ...saved.compiler },
      cppcheck: { ...DEFAULTS.cppcheck, ...saved.cppcheck },
      editor: { ...DEFAULTS.editor, ...saved.editor },
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const filePath = getSettingsPath()
  await fs.writeFile(filePath, JSON.stringify(settings, null, 2), 'utf-8')
}
