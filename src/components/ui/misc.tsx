import * as React from 'react'
import { cn } from '@/lib/utils'
import { Loader2, type LucideProps } from 'lucide-react'

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'solid' | 'outline'
  size?: 'sm' | 'md'
}

export function Badge({ className, variant = 'default', size = 'md', children, ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold transition-colors',
        {
          'bg-[#262626] text-[#a3a3a3] border border-[#333333]':
            variant === 'default',
          'bg-[#3ec489]/15 text-[#3ec489] border border-[#3ec489]/30':
            variant === 'primary',
          'bg-[#262626] text-[#737373] border border-[#333333]':
            variant === 'secondary',
          'bg-[#2d7a4f]/15 text-[#3ec489] border border-[#3ec489]/30':
            variant === 'success',
          'bg-[#f5b100]/15 text-[#f5b100] border border-[#f5b100]/30':
            variant === 'warning',
          'bg-[#f25d44]/15 text-[#f25d44] border border-[#f25d44]/30':
            variant === 'error',
          'bg-[#3ec489] text-white shadow-lg shadow-[#3ec489]/20': variant === 'solid',
          'border border-[#333333] text-[#a3a3a3]':
            variant === 'outline',
        },
        {
          'px-2 py-0.5 text-xs': size === 'sm',
          'px-3 py-1 text-xs': size === 'md',
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  showLabel?: boolean
  variant?: 'default' | 'success' | 'warning' | 'error'
  size?: 'sm' | 'md'
}

export function Progress({
  className,
  value,
  max = 100,
  showLabel = false,
  variant = 'default',
  size = 'md',
  ...props
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  return (
    <div
      className={cn('relative w-full overflow-hidden rounded-full bg-[#262626]', className)}
      {...props}
    >
      <div
        className={cn('h-full transition-all duration-500 ease-out rounded-full', {
          'bg-[#3ec489]': variant === 'default' || variant === 'success',
          'bg-[#f5b100]': variant === 'warning',
          'bg-[#f25d44]': variant === 'error',
          'h-1': size === 'sm',
          'h-2': size === 'md',
        })}
        style={{ width: `${percentage}%` }}
      />
      {showLabel && (
        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  )
}

interface SpinnerProps extends Omit<LucideProps, 'ref'> {
  size?: 'sm' | 'md' | 'lg'
  color?: 'default' | 'primary' | 'white'
}

export function Spinner({ className, size = 'md', color = 'default' }: SpinnerProps) {
  return (
    <Loader2
      className={cn(
        'animate-spin',
        {
          'h-4 w-4': size === 'sm',
          'h-5 w-5': size === 'md',
          'h-8 w-8': size === 'lg',
          'text-[#737373]': color === 'default',
          'text-[#3ec489]': color === 'primary',
          'text-white': color === 'white',
        },
        className
      )}
    />
  )
}

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-xl bg-[#262626]', className)}
      {...props}
    />
  )
}

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string
  alt?: string
  fallback?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  status?: 'online' | 'offline' | 'busy'
}

export function Avatar({ className, src, alt, fallback, size = 'md', status, ...props }: AvatarProps) {
  const [error, setError] = React.useState(false)

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center rounded-full bg-gradient-to-br from-[#3ec489]/20 to-[#3ec489]/5 overflow-hidden',
        {
          'h-8 w-8 text-xs': size === 'sm',
          'h-10 w-10 text-sm': size === 'md',
          'h-12 w-12 text-base': size === 'lg',
          'h-16 w-16 text-lg': size === 'xl',
        },
        className
      )}
      {...props}
    >
      {src && !error ? (
        <img
          src={src}
          alt={alt || ''}
          className="h-full w-full object-cover"
          onError={() => setError(true)}
        />
      ) : (
        <span className="font-semibold text-[#3ec489]">
          {fallback || '?'}
        </span>
      )}
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 block rounded-full ring-2 ring-[#1f1f1f]',
            {
              'h-2.5 w-2.5 bg-[#3ec489]': status === 'online',
              'h-2.5 w-2.5 bg-[#737373]': status === 'offline',
              'h-2.5 w-2.5 bg-[#f25d44]': status === 'busy',
            }
          )}
        />
      )}
    </div>
  )
}

interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical'
  label?: string
}

export function Divider({ className, orientation = 'horizontal', label, ...props }: DividerProps) {
  if (orientation === 'vertical') {
    return (
      <div
        className={cn('w-px h-full bg-[#2e2e2e]', className)}
        {...props}
      />
    )
  }

  return (
    <div className={cn('flex items-center gap-4', className)} {...props}>
      <div className="flex-1 h-px bg-[#2e2e2e]" />
      {label && <span className="text-xs text-[#737373] font-medium">{label}</span>}
      <div className="flex-1 h-px bg-[#2e2e2e]" />
    </div>
  )
}
