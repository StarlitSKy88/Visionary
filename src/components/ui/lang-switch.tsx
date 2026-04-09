'use client'

import { useI18n } from '@/i18n'

export function LangSwitch({ className = '' }: { className?: string }) {
  const { t, switchLocale } = useI18n()

  return (
    <button
      onClick={switchLocale}
      className={`px-3 py-1.5 text-xs rounded-lg border transition-all
        border-[var(--border-color)] hover:border-[var(--border-hover)]
        text-[var(--text-muted)] hover:text-[var(--text-primary)]
        bg-transparent hover:bg-[var(--accent-frost-dim)]
        ${className}`}
    >
      {t.common.switchLang}
    </button>
  )
}
