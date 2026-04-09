import * as React from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-display font-semibold transition-all duration-200 rounded-xl',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#2e3440]',
          {
            'bg-[#88c0d0] text-[#2e3440] hover:bg-[#9ccad8] active:bg-[#7ab3c4] shadow-frost hover:shadow-md focus:ring-[#88c0d0]': variant === 'primary',
            'bg-[#3b4252] text-[#d8dee9] hover:bg-[#434c5e] focus:ring-[#3b4252]': variant === 'secondary',
            'border border-[rgba(136,192,208,0.25)] bg-transparent text-[#88c0d0] hover:bg-[rgba(136,192,208,0.08)] hover:border-[rgba(136,192,208,0.4)] focus:ring-[#88c0d0]': variant === 'outline',
            'hover:bg-[rgba(136,192,208,0.08)] text-[#d8dee9] focus:ring-[#88c0d0]': variant === 'ghost',
            'bg-[#bf616a] text-[#eceff4] hover:bg-[#c9747c] focus:ring-[#bf616a]': variant === 'destructive',
          },
          {
            'h-9 px-3 text-sm': size === 'sm',
            'h-11 px-4 text-sm': size === 'md',
            'h-12 px-6 text-base': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
