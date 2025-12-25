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
    <div className="relative grid grid-cols-[90px_1fr] items-center gap-3" ref={ref}>
      <div className="text-[11px] text-[#666] uppercase">{label}</div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center border border-black bg-white px-3 py-1.5 text-sm text-black hover:bg-[#f0f0f0] transition rounded-none h-9"
      >
        <div className="flex w-full items-center">
          <span
            className="inline-block h-4 w-full border border-black/20"
            style={{ background: value }}
          />
        </div>
      </button>
      {open && (
        <div className="absolute z-20 left-0 right-0 top-full mt-1 border border-black bg-white p-3 shadow-xl">
          <div className="grid grid-cols-10 gap-1.5">
            {pebbleColors.map((c) => (
              <button
                key={c.hex}
                className={cn(
                  'h-6 border border-black/10 transition focus:outline-none focus:ring-1 focus:ring-black focus:ring-offset-1',
                  value === c.hex ? 'ring-1 ring-black ring-offset-1' : 'hover:scale-110',
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
