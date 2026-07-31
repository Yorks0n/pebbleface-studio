/* eslint-disable react-refresh/only-export-components */
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 disabled:pointer-events-none disabled:opacity-45',
  {
    variants: {
      variant: {
        default:
          'border-indigo-600 bg-indigo-600 text-white hover:border-indigo-700 hover:bg-indigo-700',
        subtle:
          'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
        ghost: 'border-transparent bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950',
        outline:
          'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
        destructive: 'border-rose-200 bg-white text-rose-600 hover:bg-rose-50',
      },
      size: {
        default: 'h-9 px-3.5 py-2',
        sm: 'h-8 px-2.5 text-xs',
        lg: 'h-10 px-4 text-sm',
        icon: 'h-8 w-8 p-0',
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
