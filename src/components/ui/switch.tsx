import * as React from 'react'
import { cn } from '../../lib/utils'

const Switch = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
    onCheckedChange?: (checked: boolean) => void
  }
>(({ className, checked, onCheckedChange, ...props }, ref) => {
  return (
    <label
      className={cn(
        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-slate-300 bg-slate-200 p-0.5 transition-colors focus-within:ring-2 focus-within:ring-indigo-200 data-[state=checked]:border-indigo-600 data-[state=checked]:bg-indigo-600',
        className,
      )}
      data-state={checked ? 'checked' : 'unchecked'}
    >
      <input
        type="checkbox"
        className="sr-only"
        ref={ref}
        checked={checked}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        {...props}
      />
      <span
        className={cn(
          'pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-sm ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0',
        )}
        data-state={checked ? 'checked' : 'unchecked'}
      />
    </label>
  )
})
Switch.displayName = 'Switch'

export { Switch }
