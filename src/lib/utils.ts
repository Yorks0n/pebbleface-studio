import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function uid(prefix = 'node') {
  return `${prefix}-${randomUuid()}`
}

export function randomUuid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)
  return `${s4()}${s4()}-${s4()}-4${s4().substring(1)}-${((8 + Math.random() * 4) | 0).toString(16)}${s4().substring(1)}-${s4()}${s4()}${s4()}`
}

const PREVIEW_BLACK = '#000000'
const PREVIEW_GRAY = '#aaaaaa'
const PREVIEW_WHITE = '#ffffff'

const to2BitLevel = (channel: number) => Math.max(0, Math.min(3, Math.round(channel / 85)))

export function triToneValueFromRgb(r: number, g: number, b: number) {
  const r2 = to2BitLevel(r)
  const g2 = to2BitLevel(g)
  const b2 = to2BitLevel(b)

  if (g2 === 0) return 0
  if (g2 === 3) return 255

  if (g2 === 1) {
    return 4 * r2 + b2 <= 4 ? 0 : 170
  }

  if (g2 === 2) {
    return 4 * r2 + b2 >= 11 ? 255 : 170
  }

  return 170
}

export function apliteColor(value: string) {
  const hex = value?.replace('#', '') || 'ffffff'
  const to = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex
  const int = parseInt(to, 16)
  if (Number.isNaN(int)) return PREVIEW_WHITE
  const r = (int >> 16) & 255
  const g = (int >> 8) & 255
  const b = int & 255
  const value3 = triToneValueFromRgb(r, g, b)
  if (value3 === 0) return PREVIEW_BLACK
  if (value3 === 255) return PREVIEW_WHITE
  return PREVIEW_GRAY
}
