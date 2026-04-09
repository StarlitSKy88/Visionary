'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'solid'
  icon?: React.ReactNode
}

export function Badge({ className, variant = 'default', icon, children, ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
        {
          'bg-[rgba(136,192,208,0.1)] text-[#81a1c1]': variant === 'default',
          'bg-[rgba(136,192,208,0.15)] text-[#88c0d0]': variant === 'primary',
          'bg-[#3b4252] text-[#d8dee9]': variant === 'secondary',
          'bg-[rgba(163,190,140,0.15)] text-[#a3be8c]': variant === 'success',
          'bg-[rgba(235,203,139,0.15)] text-[#ebcb8b]': variant === 'warning',
          'bg-[#88c0d0] text-[#2e3440]': variant === 'solid',
        },
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </div>
  )
}

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  showLabel?: boolean
}

export function Progress({ className, value, max = 100, showLabel = false, ...props }: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  return (
    <div className={cn('relative h-2 w-full overflow-hidden rounded-full bg-[#3b4252]', className)} {...props}>
      <div
        className="h-full bg-[#88c0d0] transition-all duration-500 ease-out rounded-full"
        style={{ width: `${percentage}%` }}
      />
      {showLabel && (
        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-[#eceff4]">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  )
}

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg'
}

export function Spinner({ className, size = 'md', ...props }: SpinnerProps) {
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-[#3b4252] border-t-[#88c0d0]',
        {
          'h-4 w-4': size === 'sm',
          'h-6 w-6': size === 'md',
          'h-8 w-8': size === 'lg',
        },
        className
      )}
      {...props}
    />
  )
}

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-xl bg-[#3b4252]', className)}
      {...props}
    />
  )
}
