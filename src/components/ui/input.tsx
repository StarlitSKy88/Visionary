import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-12 w-full rounded-xl border border-[rgba(136,192,208,0.2)] bg-[#3b4252] px-4 py-2 text-sm text-[#eceff4]',
          'placeholder:text-[#616e88]',
          'focus:outline-none focus:ring-2 focus:ring-[#88c0d0] focus:ring-offset-2 focus:ring-offset-[#2e3440] focus:border-[#88c0d0]',
          'disabled:cursor-not-allowed disabled:opacity-40',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[120px] w-full rounded-xl border border-[rgba(136,192,208,0.2)] bg-[#3b4252] px-4 py-3 text-sm text-[#eceff4]',
          'placeholder:text-[#616e88]',
          'focus:outline-none focus:ring-2 focus:ring-[#88c0d0] focus:ring-offset-2 focus:ring-offset-[#2e3440] focus:border-[#88c0d0]',
          'disabled:cursor-not-allowed disabled:opacity-40',
          'resize-none',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = 'Textarea'
