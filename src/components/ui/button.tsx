/* eslint-disable react-refresh/only-export-components */
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2ff49] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 gap-2',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-r from-[#3ba8ff] to-[#00f1ff] text-black shadow shadow-[#00f1ff]/30 hover:brightness-110',
        subtle:
          'bg-white/5 text-white border border-white/10 hover:border-[#3ba8ff]/60 hover:bg-white/10 shadow-sm data-[state=active]:border-[#3ba8ff] data-[state=active]:text-[#3ba8ff]',
        ghost: 'bg-transparent text-white/70 hover:text-white hover:bg-white/5 data-[state=active]:text-[#3ba8ff]',
        outline:
          'border border-white/20 text-white hover:border-[#00f1ff]/60 hover:text-white shadow-sm data-[state=active]:border-[#3ba8ff]',
        destructive: 'bg-red-500 text-white hover:bg-red-600',
      },
      size: {
        default: 'h-9 px-3',
        sm: 'h-8 px-2 text-xs',
        lg: 'h-11 px-4 text-base',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
  ),
)
Button.displayName = 'Button'

export { Button, buttonVariants }
