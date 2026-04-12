import * as React from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
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

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#161616]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'active:scale-[0.98]', // subtle press effect

          // Variant styles - Dark theme optimized
          {
            'bg-[#3ec489] text-white hover:bg-[#2eb06c] active:bg-[#1a6645] shadow-lg shadow-[#3ec489]/20 hover:shadow-[#3ec489]/30':
              variant === 'primary',
            'bg-[#262626] text-white hover:bg-[#333333] active:bg-[#404040] border border-[#333333]':
              variant === 'secondary',
            'border border-[#333333] bg-transparent hover:bg-[#262626] text-white focus:ring-[#3ec489]':
              variant === 'outline',
            'bg-transparent hover:bg-[#262626] text-[#d4d4d4] hover:text-white border border-transparent hover:border-[#333333] focus:ring-[#3ec489]':
              variant === 'ghost',
            'bg-[#f25d44] text-white hover:bg-[#b33d26] active:bg-[#8a2f1d] shadow-lg shadow-[#f25d44]/20 focus:ring-[#f25d44]':
              variant === 'destructive',
          },

          // Size styles
          {
            'h-8 px-3 text-xs gap-1.5 rounded-lg': size === 'xs',
            'h-9 px-4 text-sm gap-2 rounded-lg': size === 'sm',
            'h-11 px-5 text-sm gap-2 rounded-xl': size === 'base',
            'h-14 px-8 text-base gap-3 rounded-xl': size === 'lg',
            'h-11 w-11 rounded-xl': size === 'icon',
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
