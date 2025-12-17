import * as React from 'react'
import { cn } from '../../lib/utils'

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn('text-xs font-medium text-white/70 tracking-wide uppercase', className)}
    {...props}
  />
))
Label.displayName = 'Label'

export { Label }
