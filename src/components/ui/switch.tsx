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
        'peer inline-flex h-[20px] w-[36px] shrink-0 cursor-pointer items-center border-2 border-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 bg-white data-[state=checked]:bg-black',
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
          'pointer-events-none block h-3 w-3 bg-current shadow-none ring-0 transition-transform bg-[#ccc] data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0 data-[state=checked]:bg-white',
        )}
        data-state={checked ? 'checked' : 'unchecked'}
      />
    </label>
  )
})
Switch.displayName = 'Switch'

export { Switch }