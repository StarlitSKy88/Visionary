import * as React from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'solid' | 'outline'
  size?: 'sm' | 'md'
}

export function Badge({ className, variant = 'default', size = 'md', children, style, ...props }: BadgeProps) {
  // 反AI设计 - 非标准圆角
  const borderRadii = ['2px', '4px', '6px', '3px', '8px']
  const randomRadius = borderRadii[Math.floor(Math.random() * borderRadii.length)]

  const getVariantStyle = () => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: 'rgba(220,38,38,0.15)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.4)' }
      case 'success':
        return { backgroundColor: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }
      case 'warning':
        return { backgroundColor: 'rgba(180,83,9,0.12)', color: '#c9a962', border: '1px solid rgba(180,83,9,0.3)' }
      case 'error':
        return { backgroundColor: 'rgba(220,38,38,0.12)', color: '#ef4444', border: '1px solid rgba(220,38,38,0.3)' }
      case 'solid':
        return { backgroundColor: '#991b1b', color: '#fff', border: 'none' }
      default:
        return { backgroundColor: 'rgba(0,0,0,0.35)', color: '#a8a29e', border: '1px solid rgba(180,83,9,0.2)' }
    }
  }

  return (
    <div
      className={cn(className)}
      style={{
        ...getVariantStyle(),
        borderRadius: randomRadius,
        padding: size === 'sm' ? '2px 8px' : '4px 10px',
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '1px',
        fontFamily: "'Noto Serif SC', serif",
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        ...style,
      }}
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
  style,
  ...props
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  const getVariantColor = () => {
    switch (variant) {
      case 'success': return '#10b981'
      case 'warning': return '#c9a962'
      case 'error': return '#dc2626'
      default: return '#991b1b'
    }
  }

  return (
    <div
      className={cn(className)}
      style={{
        width: '100%',
        height: size === 'sm' ? '4px' : '6px',
        backgroundColor: 'rgba(0,0,0,0.35)',
        borderRadius: '3px',
        overflow: 'hidden',
        position: 'relative',
        transform: 'skewX(-2deg)',
        ...style,
      }}
      {...props}
    >
      <div
        style={{
          width: `${percentage}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${getVariantColor()}, ${variant === 'default' ? '#dc2626' : getVariantColor()})`,
          borderRadius: '3px',
          transition: 'width 0.5s ease-out',
          transform: 'skewX(2deg)',
        }}
      />
      {showLabel && (
        <span style={{
          position: 'absolute',
          right: '8px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '10px',
          color: '#a8a29e',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  )
}

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg'
  color?: 'default' | 'primary' | 'white'
}

export function Spinner({ className, size = 'md', color = 'default', style, ...props }: SpinnerProps) {
  const sizes = { sm: '16px', md: '20px', lg: '32px' }
  const colors = { default: '#78716c', primary: '#c9a962', white: '#fff' }

  return (
    <div
      className={cn(className)}
      style={{
        width: sizes[size],
        height: sizes[size],
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: sizes[size],
        color: colors[color],
        animation: 'spin 1.2s linear infinite',
        transform: 'rotate(-10deg)',
        ...style,
      }}
      {...props}
    >
      ◉
    </div>
  )
}

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, style, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(className)}
      style={{
        backgroundColor: 'rgba(0,0,0,0.25)',
        borderRadius: '4px',
        animation: 'pulse 2s ease-in-out infinite',
        ...style,
      }}
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

export function Avatar({ className, src, alt, fallback, size = 'md', status, style, ...props }: AvatarProps) {
  const [error, setError] = React.useState(false)
  const sizes = { sm: '32px', md: '40px', lg: '48px', xl: '64px' }
  const borderRadii = ['40% 60% 55% 45%', '45% 55% 50% 50%', '50% 50% 45% 55%']

  return (
    <div
      className={cn(className)}
      style={{
        width: sizes[size],
        height: sizes[size],
        borderRadius: borderRadii[Math.floor(Math.random() * borderRadii.length)],
        backgroundColor: 'rgba(0,0,0,0.35)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)',
        ...style,
      }}
      {...props}
    >
      {src && !error ? (
        <img
          src={src}
          alt={alt || ''}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setError(true)}
        />
      ) : (
        <span style={{
          fontSize: size === 'sm' ? '12px' : size === 'md' ? '14px' : size === 'lg' ? '18px' : '24px',
          color: '#c9a962',
          fontWeight: 600,
          transform: 'rotate(-3deg)',
          display: 'inline-block'
        }}>
          {fallback || '?'}
        </span>
      )}
      {status && (
        <span style={{
          position: 'absolute',
          bottom: '0',
          right: '0',
          width: size === 'sm' ? '8px' : '10px',
          height: size === 'sm' ? '8px' : '10px',
          borderRadius: '50%',
          backgroundColor: status === 'online' ? '#10b981' : status === 'busy' ? '#dc2626' : '#78716c',
          boxShadow: '0 0 4px rgba(0,0,0,0.5)',
          transform: 'translate(2px, 2px)',
        }} />
      )}
    </div>
  )
}

interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical'
  label?: string
}

export function Divider({ className, orientation = 'horizontal', label, style, ...props }: DividerProps) {
  if (orientation === 'vertical') {
    return (
      <div
        className={cn(className)}
        style={{
          width: '1px',
          height: '100%',
          background: 'linear-gradient(to bottom, transparent, rgba(180,83,9,0.4), transparent)',
          transform: 'rotate(-5deg)',
          ...style,
        }}
        {...props}
      />
    )
  }

  return (
    <div className={cn(className)} style={{ display: 'flex', alignItems: 'center', gap: '16px', ...style }} {...props}>
      <div style={{
        flex: 1,
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(180,83,9,0.4), transparent)',
        transform: 'rotate(-0.5deg)',
      }} />
      {label && (
        <span style={{
          fontSize: '10px',
          color: '#78716c',
          letterSpacing: '2px',
          fontFamily: "'Noto Serif SC', serif",
        }}>{label}</span>
      )}
      <div style={{
        flex: 1,
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(180,83,9,0.4), transparent)',
        transform: 'rotate(0.5deg)',
      }} />
    </div>
  )
}
