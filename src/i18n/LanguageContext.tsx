/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, ReactNode, useMemo } from 'react'
import { translations, Language } from './translations'

interface LanguageContextType {
  language: Language
  t: (keyPath: string, params?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'sr',
  t: (keyPath: string) => keyPath,
})

export function LanguageProvider({
  language = 'sr',
  children,
}: {
  language?: Language
  children: ReactNode
}) {
  const value = useMemo(() => {
    const lang: Language = language === 'en' ? 'en' : 'sr'
    const dict = translations[lang]

    function t(keyPath: string, params?: Record<string, string | number>): string {
      const keys = keyPath.split('.')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let current: any = dict

      for (const k of keys) {
        if (current && typeof current === 'object' && k in current) {
          current = current[k]
        } else {
          // Fallback to Serbian if missing in current language
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let fallback: any = translations.sr
          for (const fk of keys) {
            if (fallback && typeof fallback === 'object' && fk in fallback) {
              fallback = fallback[fk]
            } else {
              return keyPath
            }
          }
          current = fallback
          break
        }
      }

      if (typeof current !== 'string') {
        return keyPath
      }

      let result = current
      if (params) {
        for (const [pk, pv] of Object.entries(params)) {
          result = result.replace(new RegExp(`{{${pk}}}`, 'g'), String(pv))
        }
      }
      return result
    }

    return { language: lang, t }
  }, [language])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useTranslation() {
  return useContext(LanguageContext)
}
