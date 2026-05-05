import { describe, it, expect } from 'vitest'
import {
  imageTimeGlyphKeys,
  imageTimeFormatExpression,
  needsUppercaseImageTime,
  buildImageTimePositions,
  imageTimeRenderedValue,
  parseGlyphKeyFromFileName,
  usesSegmentedImageTime,
  imageTimeCharCount,
} from './image-time'
import type { ImageTimeNode } from '../store/scene'

// Minimal ImageTimeNode factory — only the fields the pure functions actually use
function node(overrides: Partial<ImageTimeNode> = {}): ImageTimeNode {
  return {
    id: 'n1',
    name: 'test',
    type: 'image-time',
    x: 0,
    y: 0,
    width: 100,
    height: 40,
    rotation: 0,
    stroke: '#000000',
    strokeWidth: 1,
    mode: 'time',
    timeFormat: '24h',
    dateFormat: 'MM',
    weekFormat: 'letters',
    glyphs: [],
    charSpacing: 2,
    groupSpacing: 4,
    ...overrides,
  }
}

// ─── imageTimeGlyphKeys ──────────────────────────────────────────────────────

describe('imageTimeGlyphKeys', () => {
  it('time mode → digits 0-9', () => {
    expect(imageTimeGlyphKeys(node({ mode: 'time' }))).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'])
  })

  it('date+MM → digits 0-9', () => {
    expect(imageTimeGlyphKeys(node({ mode: 'date', dateFormat: 'MM' }))).toEqual([
      '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    ])
  })

  it('date+MMM → 12 month abbreviations', () => {
    expect(imageTimeGlyphKeys(node({ mode: 'date', dateFormat: 'MMM' }))).toEqual([
      'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
      'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
    ])
  })

  it('week+letters → letter subset', () => {
    const keys = imageTimeGlyphKeys(node({ mode: 'week', weekFormat: 'letters' }))
    expect(keys).toContain('M')
    expect(keys).toContain('W')
    expect(keys).not.toContain('0')
    expect(keys.length).toBe(14)
  })

  it('week+words → 7 day names', () => {
    expect(imageTimeGlyphKeys(node({ mode: 'week', weekFormat: 'words' }))).toEqual([
      'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT',
    ])
  })
})

// ─── imageTimeFormatExpression ────────────────────────────────────────────────

describe('imageTimeFormatExpression', () => {
  it('time+24h → %H%M', () => {
    expect(imageTimeFormatExpression(node({ mode: 'time', timeFormat: '24h' }))).toBe('%H%M')
  })

  it('time+12h → %I%M', () => {
    expect(imageTimeFormatExpression(node({ mode: 'time', timeFormat: '12h' }))).toBe('%I%M')
  })

  it('date+MM → %m', () => {
    expect(imageTimeFormatExpression(node({ mode: 'date', dateFormat: 'MM' }))).toBe('%m')
  })

  it('date+DD → %d', () => {
    expect(imageTimeFormatExpression(node({ mode: 'date', dateFormat: 'DD' }))).toBe('%d')
  })

  it('date+MMM → %b', () => {
    expect(imageTimeFormatExpression(node({ mode: 'date', dateFormat: 'MMM' }))).toBe('%b')
  })

  it('week → %a', () => {
    expect(imageTimeFormatExpression(node({ mode: 'week' }))).toBe('%a')
  })
})

// ─── needsUppercaseImageTime ─────────────────────────────────────────────────

describe('needsUppercaseImageTime', () => {
  it('time mode → false', () => {
    expect(needsUppercaseImageTime(node({ mode: 'time' }))).toBe(false)
  })

  it('date+MMM → true (month names come out lowercase from strftime)', () => {
    expect(needsUppercaseImageTime(node({ mode: 'date', dateFormat: 'MMM' }))).toBe(true)
  })

  it('week → true (weekday names come out lowercase from strftime)', () => {
    expect(needsUppercaseImageTime(node({ mode: 'week' }))).toBe(true)
  })
})

// ─── buildImageTimePositions ─────────────────────────────────────────────────

describe('buildImageTimePositions', () => {
  it('4-char time layout: correct x positions with charSpacing + groupSpacing', () => {
    // 100px wide, 4 chars, charSpacing=2, groupSpacing=6
    // totalGap = 2*2 + 6 = 10, charWidth = (100-10)/4 = 22.5
    // positions: [0, 24.5, 51, 75.5]
    const result = buildImageTimePositions(100, 4, 2, 6)
    expect(result.charWidth).toBeCloseTo(22.5)
    expect(result.positions).toHaveLength(4)
    expect(result.positions[0]).toBe(0)
    expect(result.positions[1]).toBeCloseTo(24.5) // 0 + 22.5 + 2 (charSpacing after index 0)
    expect(result.positions[2]).toBeCloseTo(53)   // 24.5 + 22.5 + 6 (groupSpacing after index 1)
    expect(result.positions[3]).toBeCloseTo(77.5) // 53 + 22.5 + 2 (charSpacing after index 2)
  })

  it('2-char date layout', () => {
    // 80px wide, 2 chars, charSpacing=4, groupSpacing=0
    // totalGap = 4*1 = 4, charWidth = (80-4)/2 = 38
    const result = buildImageTimePositions(80, 2, 4, 0)
    expect(result.charWidth).toBeCloseTo(38)
    expect(result.positions).toHaveLength(2)
    expect(result.positions[0]).toBe(0)
    expect(result.positions[1]).toBeCloseTo(42) // 38 + 4
  })

  it('charCount=0 → empty positions, charWidth falls back to totalWidth clamped to 4', () => {
    const result = buildImageTimePositions(100, 0, 2, 4)
    expect(result.positions).toHaveLength(0)
    expect(result.charWidth).toBe(100)
  })

  it('charWidth is clamped to minimum 4 even with extreme spacing', () => {
    // totalGap would exceed totalWidth
    const result = buildImageTimePositions(10, 4, 50, 50)
    expect(result.charWidth).toBeGreaterThanOrEqual(4)
  })
})

// ─── imageTimeRenderedValue ──────────────────────────────────────────────────

describe('imageTimeRenderedValue', () => {
  const d = (year: number, month: number, day: number, hours = 0, minutes = 0) =>
    new Date(year, month - 1, day, hours, minutes)

  it('time+24h → 4 digit parts', () => {
    const result = imageTimeRenderedValue(d(2024, 3, 15, 14, 7), node({ mode: 'time', timeFormat: '24h' }))
    expect(result).toEqual({ type: 'segmented', parts: ['1', '4', '0', '7'] })
  })

  it('time+12h normal → 4 digit parts', () => {
    const result = imageTimeRenderedValue(d(2024, 3, 15, 14, 7), node({ mode: 'time', timeFormat: '12h' }))
    expect(result).toEqual({ type: 'segmented', parts: ['0', '2', '0', '7'] })
  })

  it('time+12h midnight (00:00) → 12:00, not 00:00', () => {
    // getHours()=0, 0%12=0, 0||12=12
    const result = imageTimeRenderedValue(d(2024, 3, 15, 0, 0), node({ mode: 'time', timeFormat: '12h' }))
    expect(result).toEqual({ type: 'segmented', parts: ['1', '2', '0', '0'] })
  })

  it('date+DD → 2 digit parts for day', () => {
    const result = imageTimeRenderedValue(d(2024, 3, 5), node({ mode: 'date', dateFormat: 'DD' }))
    expect(result).toEqual({ type: 'segmented', parts: ['0', '5'] })
  })

  it('date+MM → 2 digit parts for month', () => {
    const result = imageTimeRenderedValue(d(2024, 11, 1), node({ mode: 'date', dateFormat: 'MM' }))
    expect(result).toEqual({ type: 'segmented', parts: ['1', '1'] })
  })

  it('date+MMM → whole key, uppercase month abbreviation', () => {
    const result = imageTimeRenderedValue(d(2024, 3, 15), node({ mode: 'date', dateFormat: 'MMM' }))
    expect(result.type).toBe('whole')
    if (result.type === 'whole') expect(result.key).toBe('MAR')
  })

  it('week+letters → 3 segmented parts', () => {
    // 2024-03-15 is a Friday
    const result = imageTimeRenderedValue(d(2024, 3, 15), node({ mode: 'week', weekFormat: 'letters' }))
    expect(result).toEqual({ type: 'segmented', parts: ['F', 'R', 'I'] })
  })

  it('week+words → whole key', () => {
    const result = imageTimeRenderedValue(d(2024, 3, 15), node({ mode: 'week', weekFormat: 'words' }))
    expect(result.type).toBe('whole')
    if (result.type === 'whole') expect(result.key).toBe('FRI')
  })
})

// ─── parseGlyphKeyFromFileName ───────────────────────────────────────────────

describe('parseGlyphKeyFromFileName', () => {
  it('single digit filename → that digit', () => {
    expect(parseGlyphKeyFromFileName('5.png')).toBe('5')
  })

  it('single letter → that letter', () => {
    expect(parseGlyphKeyFromFileName('A.png')).toBe('A')
  })

  it('exact 3-letter month → month key', () => {
    expect(parseGlyphKeyFromFileName('JAN.png')).toBe('JAN')
  })

  it('exact 3-letter weekday → weekday key', () => {
    expect(parseGlyphKeyFromFileName('MON.png')).toBe('MON')
  })

  it('word containing month abbreviation → extracted month key', () => {
    expect(parseGlyphKeyFromFileName('glyph_JAN_v2.png')).toBe('JAN')
  })

  it('lowercase input → uppercased before matching', () => {
    expect(parseGlyphKeyFromFileName('jan.png')).toBe('JAN')
  })

  it('"COLON.png" → null (not C, not a known 3-letter word)', () => {
    expect(parseGlyphKeyFromFileName('COLON.png')).toBeNull()
  })

  it('empty filename → null', () => {
    expect(parseGlyphKeyFromFileName('.png')).toBeNull()
  })

  it('purely numeric filename exceeding 1 char → null (no single digit)', () => {
    expect(parseGlyphKeyFromFileName('55.png')).toBeNull()
  })
})

// ─── usesSegmentedImageTime ──────────────────────────────────────────────────

describe('usesSegmentedImageTime', () => {
  it('time → segmented', () => {
    expect(usesSegmentedImageTime(node({ mode: 'time' }))).toBe(true)
  })

  it('date+MM → segmented', () => {
    expect(usesSegmentedImageTime(node({ mode: 'date', dateFormat: 'MM' }))).toBe(true)
  })

  it('date+MMM → NOT segmented (whole word)', () => {
    expect(usesSegmentedImageTime(node({ mode: 'date', dateFormat: 'MMM' }))).toBe(false)
  })

  it('week+letters → segmented', () => {
    expect(usesSegmentedImageTime(node({ mode: 'week', weekFormat: 'letters' }))).toBe(true)
  })

  it('week+words → NOT segmented (whole word)', () => {
    expect(usesSegmentedImageTime(node({ mode: 'week', weekFormat: 'words' }))).toBe(false)
  })
})

// ─── imageTimeCharCount ──────────────────────────────────────────────────────

describe('imageTimeCharCount', () => {
  it('time → 4', () => expect(imageTimeCharCount(node({ mode: 'time' }))).toBe(4))
  it('date+MM → 2', () => expect(imageTimeCharCount(node({ mode: 'date', dateFormat: 'MM' }))).toBe(2))
  it('date+DD → 2', () => expect(imageTimeCharCount(node({ mode: 'date', dateFormat: 'DD' }))).toBe(2))
  it('date+MMM → 1 (whole)', () => expect(imageTimeCharCount(node({ mode: 'date', dateFormat: 'MMM' }))).toBe(1))
  it('week+letters → 3', () => expect(imageTimeCharCount(node({ mode: 'week', weekFormat: 'letters' }))).toBe(3))
  it('week+words → 1 (whole)', () => expect(imageTimeCharCount(node({ mode: 'week', weekFormat: 'words' }))).toBe(1))
})
