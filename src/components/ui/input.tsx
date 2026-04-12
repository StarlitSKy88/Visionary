import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, hint, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || React.useId()

    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-[#a3a3a3]"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#737373] pointer-events-none z-10">
              {leftIcon}
            </div>
          )}
          <input
            type={type}
            id={inputId}
            className={cn(
              // Base styles - Dark theme
              'flex w-full rounded-xl border border-[#333333] bg-[#262626] px-4 py-3.5 text-base text-white',
              'placeholder:text-[#737373]',
              'focus:outline-none focus:ring-2 focus:ring-[#3ec489] focus:border-transparent',
              'focus:shadow-[0_0_0_3px_rgba(62,196,137,0.15)]',
              'disabled:cursor-not-allowed disabled:bg-[#1f1f1f] disabled:text-[#525252]',
              // Error state
              error && 'border-[#f25d44] focus:ring-[#f25d44] focus:shadow-[0_0_0_3px_rgba(242,93,68,0.15)]',
              // With icons
              leftIcon && 'pl-12',
              rightIcon && 'pr-12',
              className
            )}
            ref={ref}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#737373]">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-sm text-[#f25d44]">{error}</p>}
        {hint && !error && <p className="text-sm text-[#737373]">{hint}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const textareaId = id || React.useId()

    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-[#a3a3a3]"
          >
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          className={cn(
            // Base styles - Dark theme
            'flex min-h-[120px] w-full rounded-xl border border-[#333333] bg-[#262626] px-4 py-3.5 text-base text-white',
            'placeholder:text-[#737373]',
            'focus:outline-none focus:ring-2 focus:ring-[#3ec489] focus:border-transparent',
            'focus:shadow-[0_0_0_3px_rgba(62,196,137,0.15)]',
            'disabled:cursor-not-allowed disabled:bg-[#1f1f1f] disabled:text-[#525252]',
            'resize-none',
            // Error state
            error && 'border-[#f25d44] focus:ring-[#f25d44]',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="text-sm text-[#f25d44]">{error}</p>}
        {hint && !error && <p className="text-sm text-[#737373]">{hint}</p>}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
