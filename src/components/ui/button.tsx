/* eslint-disable react-refresh/only-export-components */
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black disabled:pointer-events-none disabled:opacity-50 gap-2 border',
  {
    variants: {
      variant: {
        default:
          'bg-black text-white border-black hover:bg-[#333] hover:border-[#333]',
        subtle:
          'bg-white text-black border-black hover:bg-[#eee]',
        ghost: 'bg-transparent text-[#666] border-transparent hover:text-black hover:bg-[#eee]',
        outline:
          'bg-transparent border-black text-black hover:bg-black hover:text-white',
        destructive: 'bg-white text-red-600 border-red-600 hover:bg-red-600 hover:text-white',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-11 px-8 text-base',
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
