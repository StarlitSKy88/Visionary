'use client'

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'
import zh from './locales/zh.json'
import en from './locales/en.json'

type Locale = 'zh' | 'en'
type TranslationKeys = typeof zh

const locales: Record<Locale, TranslationKeys> = { zh, en }

interface I18nContextValue {
  locale: Locale
  t: TranslationKeys
  setLocale: (locale: Locale) => void
  switchLocale: () => void
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'zh',
  t: zh,
  setLocale: () => {},
  switchLocale: () => {},
})

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('locale') as Locale
      if (saved && (saved === 'zh' || saved === 'en')) return saved
      const browserLang = navigator.language.toLowerCase()
      if (browserLang.startsWith('en')) return 'en'
    }
    return 'zh'
  })

  const handleSetLocale = useCallback((newLocale: Locale) => {
    setLocale(newLocale)
    if (typeof window !== 'undefined') {
      localStorage.setItem('locale', newLocale)
      document.documentElement.lang = newLocale === 'zh' ? 'zh-CN' : 'en'
    }
  }, [])

  const switchLocale = useCallback(() => {
    handleSetLocale(locale === 'zh' ? 'en' : 'zh')
  }, [locale, handleSetLocale])

  const value = useMemo(() => ({
    locale,
    t: locales[locale],
    setLocale: handleSetLocale,
    switchLocale,
  }), [locale, handleSetLocale, switchLocale])

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}

/**
 * 插值翻译 - 支持 {variable} 占位符
 * 用法: t.dashboard.inviteProgress.replace('{count}', '2')
 */
export function interpolate(template: string, values: Record<string, string | number>): string {
  let result = template
  for (const [key, value] of Object.entries(values)) {
    result = result.replace(`{${key}}`, String(value))
  }
  return result
}
