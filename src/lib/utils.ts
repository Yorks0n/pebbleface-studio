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

export function apliteColor(value: string) {
  const hex = value?.replace('#', '') || 'ffffff'
  const to = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex
  const int = parseInt(to, 16)
  const r = (int >> 16) & 255
  const g = (int >> 8) & 255
  const b = int & 255
  const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return brightness > 0.5 ? '#ffffff' : '#000000'
}
