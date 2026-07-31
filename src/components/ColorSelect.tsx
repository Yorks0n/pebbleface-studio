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
    <div className="relative grid grid-cols-[78px_1fr] items-center gap-3" ref={ref}>
      <div className="inspector-label">{label}</div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-full items-center rounded-md border border-slate-200 bg-white px-2.5 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        aria-label={`${label} color ${value}`}
        aria-expanded={open}
      >
        <span
          className="mr-2 inline-block h-4 w-4 shrink-0 rounded border border-black/10"
          style={{ background: value }}
        />
        <span className="font-mono text-[11px] uppercase">{value}</span>
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-slate-200 bg-white p-3 shadow-xl">
          <div className="grid grid-cols-8 gap-1.5">
            {pebbleColors.map((c) => (
              <button
                key={c.hex}
                className={cn(
                  'h-6 rounded border border-black/10 transition focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1',
                  value === c.hex ? 'ring-2 ring-indigo-500 ring-offset-1' : 'hover:scale-110',
                )}
                style={{ background: c.hex }}
                title={`${c.name} (${c.hex})`}
                aria-label={`${c.name} ${c.hex}`}
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
