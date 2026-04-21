'use client'

import { useState, useEffect, useCallback } from 'react'

type Theme = 'light' | 'dark'

/**
 * 主题Hook - 管理SBTI双色系统
 * 亮色模式：墨韵新生 (#f5f3ef)
 * 暗色模式：异兽觉醒 (#0d0d0d)
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  // 从localStorage读取主题
  useEffect(() => {
    const saved = localStorage.getItem('sbti-theme') as Theme
    if (saved) {
      setTheme(saved)
      applyTheme(saved)
    } else {
      // 默认亮色模式
      setTheme('light')
      applyTheme('light')
    }
    setMounted(true)
  }, [])

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement
    if (newTheme === 'dark') {
      root.classList.add('dark')
      root.classList.remove('light')
    } else {
      root.classList.remove('dark')
      root.classList.add('light')
    }
  }

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('sbti-theme', newTheme)
    applyTheme(newTheme)
  }, [theme])

  const setThemeMode = useCallback((mode: Theme) => {
    setTheme(mode)
    localStorage.setItem('sbti-theme', mode)
    applyTheme(mode)
  }, [])

  return {
    theme,
    mounted,
    toggleTheme,
    setThemeMode,
    isDark: theme === 'dark',
  }
}

/**
 * 精怪专属色系
 * 根据人格ID返回对应的配色
 */
export function getPersonalityColors(personalityId: string): {
  primary: string
  secondary: string
  gradient: string
} {
  const colorMap: Record<string, { primary: string; secondary: string }> = {
    // 龙系
    pixiu: { primary: '#1a4a6e', secondary: '#3a8aaa' },      // 貔貅
    kunpeng: { primary: '#1a4a6e', secondary: '#3a8aaa' },   // 鲲鹏
    yinglong: { primary: '#1a4a6e', secondary: '#3a8aaa' }, // 应龙
    zhulong: { primary: '#1a4a6e', secondary: '#3a8aaa' },  // 烛龙
    leoyu: { primary: '#1a4a6e', secondary: '#3a8aaa' },     // 蠃鱼

    // 凤系
    fenghuang: { primary: '#8b3a3a', secondary: '#c96a6a' }, // 凤凰
    zhuque: { primary: '#8b3a3a', secondary: '#c96a6a' },     // 朱雀
    luanniao: { primary: '#8b3a3a', secondary: '#c96a6a' },  // 鸾鸟
    jingwei: { primary: '#8b3a3a', secondary: '#c96a6a' },  // 精卫
    bifang: { primary: '#8b3a3a', secondary: '#c96a6a' },   // 毕方

    // 兽系
    qilin: { primary: '#5a5a3a', secondary: '#9a9a5a' },       // 麒麟
    bo: { primary: '#5a5a3a', secondary: '#9a9a5a' },       // 驳
    yayu: { primary: '#5a5a3a', secondary: '#9a9a5a' },    // 猰貐
    baihu: { primary: '#5a5a3a', secondary: '#9a9a5a' },    // 白虎
    kuinu: { primary: '#5a5a3a', secondary: '#9a9a5a' },   // 夔牛

    // 狐系
    jiweifox: { primary: '#6a4a7a', secondary: '#aa7acd' }, // 九尾狐

    // 水系
    gonggong: { primary: '#2a5a6a', secondary: '#5a9aaa' },  // 共工

    // 其他
    baize: { primary: '#4a5a3a', secondary: '#7a8a5a' },   // 白泽
    qiongqi: { primary: '#4a5a3a', secondary: '#7a8a5a' }, // 穷奇
    hundun: { primary: '#4a5a3a', secondary: '#7a8a5a' },  // 混沌
    xingtian: { primary: '#4a5a3a', secondary: '#7a8a5a' }, // 刑天
    taotie: { primary: '#4a5a3a', secondary: '#7a8a5a' },  // 饕餮
    taowu: { primary: '#4a5a3a', secondary: '#7a8a5a' },  // 梼杌
    chenghuang: { primary: '#4a5a3a', secondary: '#7a8a5a' }, // 乘黄
    dangkang: { primary: '#4a5a3a', secondary: '#7a8a5a' }, // 当康
    tiangou: { primary: '#4a5a3a', secondary: '#7a8a5a' },  // 天狗
    kaimingshou: { primary: '#4a5a3a', secondary: '#7a8a5a' }, // 开明兽
    diting: { primary: '#4a5a3a', secondary: '#7a8a5a' },  // 谛听
    yingzhao: { primary: '#4a5a3a', secondary: '#7a8a5a' }, // 英招
    qinglong: { primary: '#4a5a3a', secondary: '#7a8a5a' }, // 青龙
    xuanwu: { primary: '#4a5a3a', secondary: '#7a8a5a' },  // 玄武
    luwu: { primary: '#4a5a3a', secondary: '#7a8a5a' },   // 陆吾
    yeyoushen: { primary: '#4a5a3a', secondary: '#7a8a5a' }, // 夜游神
    goumang: { primary: '#4a5a3a', secondary: '#7a8a5a' }, // 句芒
    jiao: { primary: '#4a5a3a', secondary: '#7a8a5a' },    // 狡
    xiezhi: { primary: '#4a5a3a', secondary: '#7a8a5a' },   // 獬豸
  }

  const colors = colorMap[personalityId] || { primary: '#4a5a3a', secondary: '#7a8a5a' }

  return {
    primary: colors.primary,
    secondary: colors.secondary,
    gradient: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
  }
}

/**
 * 判断是否为隐藏款人格
 */
export function isSecretPersonality(personalityId: string): boolean {
  return personalityId.startsWith('secret_')
}
