import { pebbleColors } from '../lib/color-dict'
import { cn } from '../lib/utils'
import { useEffect, useRef, useState } from 'react'

type Props = {
  label: string
  value: string
  onChange: (hex: string) => void
}

export const ColorSelect = ({ label, value, onChange }: Props) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="relative space-y-1" ref={ref}>
      <div className="flex items-center justify-between text-xs uppercase text-white/60">{label}</div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80 hover:border-indigo-400/70 transition"
      >
        <span className="flex items-center gap-2">
          <span
            className="inline-block h-5 w-5 rounded-full border border-white/20 shadow-inner"
            style={{ background: value }}
          />
          <span className="tracking-wide">{value.toLowerCase()}</span>
        </span>
        <span className="text-[11px] text-white/50">Choose</span>
      </button>
      {open && (
        <div className="absolute z-20 mt-2 w-full rounded-xl border border-white/10 bg-[#0a0c12] p-3 shadow-xl">
          <div className="grid grid-cols-8 gap-2">
            {pebbleColors.map((c) => (
              <button
                key={c.hex}
                className={cn(
                  'h-7 rounded-md border border-white/10 transition focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 focus:ring-offset-black',
                  value === c.hex ? 'ring-2 ring-indigo-400 ring-offset-1 ring-offset-black' : 'hover:translate-y-[-1px]',
                )}
                style={{ background: c.hex }}
                title={`${c.name} (${c.hex})`}
                onClick={() => {
                  onChange(c.hex)
                  setOpen(false)
                }}
                type="button"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
