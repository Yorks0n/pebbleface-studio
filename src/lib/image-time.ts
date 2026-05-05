import type { ImageTimeNode } from '../store/scene'

/**
 * Returns true when the node renders individual character glyphs (segmented mode).
 * Returns false for whole-word modes: date+MMM and week+words.
 */
export function usesSegmentedImageTime(node: ImageTimeNode): boolean {
  return !(node.mode === 'date' && node.dateFormat === 'MMM') &&
    !(node.mode === 'week' && node.weekFormat === 'words')
}

/**
 * Number of glyph slots needed for this node.
 * Non-segmented modes (MMM date, words week) use 1 slot.
 */
export function imageTimeCharCount(node: ImageTimeNode): number {
  if (!usesSegmentedImageTime(node)) return 1
  if (node.mode === 'week') return 3
  if (node.mode === 'date') return 2
  return 4
}

/**
 * Full set of glyph keys required for this node.
 */
export function imageTimeGlyphKeys(node: ImageTimeNode): string[] {
  if (node.mode === 'week') {
    return node.weekFormat === 'words'
      ? ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
      : ['A', 'D', 'E', 'F', 'H', 'I', 'M', 'N', 'O', 'R', 'S', 'T', 'U', 'W']
  }
  if (node.mode === 'date' && node.dateFormat === 'MMM') {
    return ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  }
  return ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
}

/**
 * strftime format string for the C export.
 */
export function imageTimeFormatExpression(node: ImageTimeNode): string {
  if (node.mode === 'date') {
    if (node.dateFormat === 'MMM') return '%b'
    if (node.dateFormat === 'DD') return '%d'
    return '%m'
  }
  if (node.mode === 'week') return '%a'
  return node.timeFormat === '12h' ? '%I%M' : '%H%M'
}

/**
 * True when the C code needs to uppercase the strftime result before lookup
 * (week letters and month abbreviations are lowercase in C's strftime).
 */
export function needsUppercaseImageTime(node: ImageTimeNode): boolean {
  return node.mode === 'week' || (node.mode === 'date' && node.dateFormat === 'MMM')
}

/**
 * Compute x-positions and character width for rendering glyphs in a row.
 * Returns `{ positions, charWidth }`.
 */
export function buildImageTimePositions(
  totalWidth: number,
  charCount: number,
  charSpacing: number,
  groupSpacing: number,
): { positions: number[]; charWidth: number } {
  if (charCount <= 0) return { positions: [], charWidth: Math.max(4, totalWidth) }
  const gapCount = Math.max(0, charCount - 1)
  const totalGap = charCount === 4 ? charSpacing * 2 + groupSpacing : charSpacing * gapCount
  const charWidth = Math.max(4, (totalWidth - totalGap) / charCount)
  const positions: number[] = []
  let x = 0
  for (let i = 0; i < charCount; i += 1) {
    positions.push(x)
    x += charWidth
    if (i < charCount - 1) {
      x += charCount === 4 && i === 1 ? groupSpacing : charSpacing
    }
  }
  return { positions, charWidth }
}

/**
 * Determine which glyphs to render for the given time.
 */
export function imageTimeRenderedValue(
  now: Date,
  node: ImageTimeNode,
): { type: 'segmented'; parts: string[] } | { type: 'whole'; key: string } {
  if (node.mode === 'date') {
    if (node.dateFormat === 'MMM') {
      return { type: 'whole', key: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(now).toUpperCase() }
    }
    if (node.dateFormat === 'DD') {
      return { type: 'segmented', parts: String(now.getDate()).padStart(2, '0').split('') }
    }
    return { type: 'segmented', parts: String(now.getMonth() + 1).padStart(2, '0').split('') }
  }
  if (node.mode === 'week') {
    const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(now).toUpperCase()
    if (node.weekFormat === 'words') {
      return { type: 'whole', key: weekday }
    }
    return { type: 'segmented', parts: weekday.split('') }
  }
  if (node.timeFormat === '12h') {
    const hours = now.getHours() % 12 || 12
    return {
      type: 'segmented',
      parts: `${String(hours).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`.split(''),
    }
  }
  return {
    type: 'segmented',
    parts: `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`.split(''),
  }
}

/**
 * Parse a glyph key from an uploaded file name.
 * Returns the key string or null if the file name doesn't match any known pattern.
 */
export function parseGlyphKeyFromFileName(name: string): string | null {
  const base = name.replace(/\.[^/.]+$/, '').trim().toUpperCase()
  if (/^[0-9A-Z]$/.test(base)) return base
  if (/^[A-Z]{3}$/.test(base)) return base
  const wordMatch = base.match(
    /(^|[^A-Z])(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC|SUN|MON|TUE|WED|THU|FRI|SAT)([^A-Z]|$)/,
  )
  if (wordMatch?.[2]) return wordMatch[2]
  const charMatch = base.match(/(^|[^0-9A-Z])([0-9A-Z])([^0-9A-Z]|$)/)
  return charMatch?.[2] || null
}
