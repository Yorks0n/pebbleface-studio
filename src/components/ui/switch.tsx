import * as React from 'react'
import { cn } from '../../lib/utils'

export interface SwitchProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked?: boolean
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, className, ...props }, ref) => (
    <button
      ref={ref}
      role="switch"
      aria-checked={checked}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full border border-white/10 bg-white/10 transition',
        checked ? 'bg-indigo-500' : 'bg-white/10',
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 transform rounded-full bg-white shadow transition',
          checked ? 'translate-x-[22px]' : 'translate-x-1',
        )}
      />
    </button>
  ),
)
Switch.displayName = 'Switch'
