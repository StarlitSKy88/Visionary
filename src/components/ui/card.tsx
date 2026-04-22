import * as React from 'react'
import { cn } from '@/lib/utils'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  padding?: 'none' | 'sm' | 'base' | 'lg'
  variant?: 'default' | 'elevated' | 'outline'
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hover = false, padding = 'base', variant = 'default', style, ...props }, ref) => {
    // 反AI设计 - 非标准圆角
    const borderRadii = ['4px', '8px', '6px', '10px', '3px', '14px']
    const randomRadius = borderRadii[Math.floor(Math.random() * borderRadii.length)]

    return (
      <div
        ref={ref}
        className={cn(className)}
        style={{
          // Base styles - 山海经风格
          backgroundColor: 'rgba(0, 0, 0, 0.42)',
          borderRadius: randomRadius,
          border: '1px solid rgba(180, 83, 9, 0.25)',
          boxShadow: 'inset 0 2px 12px rgba(0, 0, 0, 0.5), 3px 4px 12px rgba(0, 0, 0, 0.35)',
          transition: 'all 0.3s ease-out',
          ...(hover && {
            transform: 'translateY(-2px) rotate(0.3deg)',
            backgroundColor: 'rgba(0, 0, 0, 0.48)',
            boxShadow: 'inset 0 2px 15px rgba(0, 0, 0, 0.6), 4px 5px 14px rgba(0, 0, 0, 0.4)',
          }),
          // Padding
          padding: padding === 'none' ? 0 : padding === 'sm' ? '14px' : padding === 'base' ? '18px' : '24px',
          ...style,
        }}
        {...props}
      />
    )
  }
)

Card.displayName = 'Card'

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 pb-6', className)}
      {...props}
    />
  )
)

CardHeader.displayName = 'CardHeader'

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-xl font-bold leading-none tracking-tight text-white', className)}
      {...props}
    />
  )
)

CardTitle.displayName = 'CardTitle'

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-[#a3a3a3]', className)}
      {...props}
    />
  )
)

CardDescription.displayName = 'CardDescription'

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('', className)} {...props} />
  )
)

CardContent.displayName = 'CardContent'

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center pt-6', className)}
      {...props}
    />
  )
)

CardFooter.displayName = 'CardFooter'
