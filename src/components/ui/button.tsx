import * as React from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

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
    ...props
  }, ref) => {
    const isDisabled = disabled || loading

    // Compute variant styles using CSS variables
    const getVariantStyle = (): React.CSSProperties => {
      switch (variant) {
        case 'primary':
          return {
            backgroundColor: 'var(--accent-primary)',
            color: 'var(--text-primary)',
            borderColor: 'var(--accent-primary)',
          }
        case 'secondary':
          return {
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-secondary)',
            borderColor: 'var(--border)',
          }
        case 'outline':
          return {
            backgroundColor: 'transparent',
            color: 'var(--accent-primary)',
            borderColor: 'var(--accent-primary)',
          }
        case 'ghost':
          return {
            backgroundColor: 'transparent',
            color: 'var(--text-muted)',
            borderColor: 'transparent',
          }
        case 'destructive':
          return {
            backgroundColor: 'var(--accent-danger)',
            color: 'white',
            borderColor: 'var(--accent-danger)',
          }
        case 'rect':
          return {
            backgroundColor: 'var(--accent-danger)',
            color: 'white',
            border: 'none',
            borderRadius: '0',
          }
        default:
          return {}
      }
    }

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        style={getVariantStyle()}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center font-semibold transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'active:scale-[0.98]',
          'border',
          variant === 'rect' ? 'rounded-none' : 'rounded-lg',

          // Size styles
          {
            'h-8 px-3 text-xs gap-1.5': size === 'xs',
            'h-9 px-4 text-sm gap-2': size === 'sm',
            'h-11 px-5 text-sm gap-2': size === 'base',
            'h-14 px-8 text-base gap-3': size === 'lg',
            'h-11 w-11': size === 'icon',
          },

          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : leftIcon ? (
          <span className="shrink-0">{leftIcon}</span>
        ) : null}
        {children}
        {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    )
  }
)

Button.displayName = 'Button'
