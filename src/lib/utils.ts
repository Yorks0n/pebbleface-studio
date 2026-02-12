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
const PREVIEW_DARK_GRAY = '#555555'
const PREVIEW_LIGHT_GRAY = '#aaaaaa'
const PREVIEW_WHITE = '#ffffff'

const to2BitLevel = (channel: number) => Math.max(0, Math.min(3, Math.round(channel / 85)))
const MAX_LUMINANCE = 10000
const DARK_GRAY_LUMINANCE = 3333
const LIGHT_GRAY_LUMINANCE = 6666
const BW_THRESHOLD = MAX_LUMINANCE / 2
const MID_GRAY_THRESHOLD = (DARK_GRAY_LUMINANCE + LIGHT_GRAY_LUMINANCE) / 2

export type PebbleGrayTone = 'black' | 'darkGray' | 'lightGray' | 'white'

function rgbFromHex(value: string) {
  const hex = value?.replace('#', '') || 'ffffff'
  const normalized = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex
  const int = parseInt(normalized, 16)
  if (Number.isNaN(int)) {
    return { r: 255, g: 255, b: 255 }
  }
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  }
}

export function pebbleLuminance10000FromRgb(r: number, g: number, b: number) {
  const r2 = to2BitLevel(r)
  const g2 = to2BitLevel(g)
  const b2 = to2BitLevel(b)
  return (2126 * r2 + 7152 * g2 + 722 * b2) / 3
}

export function pebbleLuminance10000FromRgbUnquantized(r: number, g: number, b: number) {
  return (2126 * r + 7152 * g + 722 * b) / 255
}

export function pebbleBwValueFromRgb(r: number, g: number, b: number) {
  return pebbleLuminance10000FromRgb(r, g, b) < BW_THRESHOLD ? 0 : 255
}

export function pebbleGrayToneFromRgb(r: number, g: number, b: number): PebbleGrayTone {
  const luminance = pebbleLuminance10000FromRgb(r, g, b)
  if (luminance < DARK_GRAY_LUMINANCE) return 'black'
  if (luminance < MID_GRAY_THRESHOLD) return 'darkGray'
  if (luminance <= LIGHT_GRAY_LUMINANCE) return 'lightGray'
  return 'white'
}

export function pebbleGrayToneFromHex(value: string): PebbleGrayTone {
  const rgb = rgbFromHex(value)
  return pebbleGrayToneFromRgb(rgb.r, rgb.g, rgb.b)
}

export function pebbleGrayToneFromHexUnquantized(value: string): PebbleGrayTone {
  const rgb = rgbFromHex(value)
  const luminance = pebbleLuminance10000FromRgbUnquantized(rgb.r, rgb.g, rgb.b)
  if (luminance < DARK_GRAY_LUMINANCE) return 'black'
  if (luminance < MID_GRAY_THRESHOLD) return 'darkGray'
  if (luminance <= LIGHT_GRAY_LUMINANCE) return 'lightGray'
  return 'white'
}

export function pebbleBwHexFromHex(value: string) {
  const rgb = rgbFromHex(value)
  return pebbleBwValueFromRgb(rgb.r, rgb.g, rgb.b) === 0 ? PREVIEW_BLACK : PREVIEW_WHITE
}

export function pebbleGrayHexFromTone(tone: PebbleGrayTone) {
  if (tone === 'black') return PREVIEW_BLACK
  if (tone === 'darkGray') return PREVIEW_DARK_GRAY
  if (tone === 'lightGray') return PREVIEW_LIGHT_GRAY
  return PREVIEW_WHITE
}

export function apliteColor(value: string) {
  return pebbleBwHexFromHex(value)
}
