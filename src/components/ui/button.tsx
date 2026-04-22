import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'rect'
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'icon'
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant = 'primary',
    size = 'base',
    loading = false,
    disabled,
    children,
    leftIcon,
    rightIcon,
    style,
    ...props
  }, ref) => {
    const isDisabled = disabled || loading

    // 反AI设计 - 非标准尺寸
    const heights = { xs: '32px', sm: '36px', base: '44px', lg: '52px', icon: '44px' }
    const paddings = { xs: '0 12px', sm: '0 16px', base: '0 20px', lg: '0 28px', icon: '0' }
    const fontSizes = { xs: '11px', sm: '12px', base: '13px', lg: '15px', icon: '14px' }

    // 印章篆刻风格
    const getVariantStyle = (): React.CSSProperties => {
      switch (variant) {
        case 'primary':
          return {
            backgroundColor: '#991b1b',
            color: '#fff',
            border: 'none',
            boxShadow: '4px 4px 0 rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
          }
        case 'secondary':
          return {
            backgroundColor: 'rgba(0,0,0,0.35)',
            color: '#a8a29e',
            border: '1px solid rgba(180,83,9,0.3)',
          }
        case 'outline':
          return {
            backgroundColor: 'transparent',
            color: '#c9a962',
            border: '1px solid #c9a962',
          }
        case 'ghost':
          return {
            backgroundColor: 'transparent',
            color: '#78716c',
            border: 'none',
          }
        case 'destructive':
          return {
            backgroundColor: '#dc2626',
            color: '#fff',
            border: 'none',
          }
        case 'rect':
          return {
            backgroundColor: '#991b1b',
            color: '#fff',
            border: 'none',
            borderRadius: '2px',
          }
        default:
          return {}
      }
    }

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        style={{
          ...getVariantStyle(),
          height: heights[size],
          padding: paddings[size],
          fontSize: fontSizes[size],
          fontWeight: 700,
          letterSpacing: '2px',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          opacity: isDisabled ? 0.5 : 1,
          transition: 'all 0.25s ease-out',
          transform: 'skewX(-3deg)',
          fontFamily: "'Noto Serif SC', serif",
          ...style,
        }}
        className={cn(className)}
        {...props}
      >
        {loading ? (
          <span style={{ fontSize: '14px', transform: 'rotate(-10deg)', display: 'inline-block' }}>◉</span>
        ) : leftIcon ? (
          <span style={{ marginRight: '6px' }}>{leftIcon}</span>
        ) : null}
        {children}
        {!loading && rightIcon && <span style={{ marginLeft: '6px' }}>{rightIcon}</span>}
      </button>
    )
  }
)

Button.displayName = 'Button'
