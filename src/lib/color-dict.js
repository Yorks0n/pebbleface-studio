// Pebble 64-color palette (2 bits per channel). Hex values are multiples of 0x55.
const steps = [
  { value: 0, hex: '00' },
  { value: 85, hex: '55' },
  { value: 170, hex: 'aa' },
  { value: 255, hex: 'ff' },
]

const aliases = {
  '#000000': 'Black',
  '#555555': 'Dark Gray',
  '#aaaaaa': 'Light Gray',
  '#ffffff': 'White',
  '#ff0000': 'Red',
  '#00ff00': 'Lime',
  '#0000ff': 'Blue',
  '#ffff00': 'Yellow',
  '#00ffff': 'Cyan',
  '#ff00ff': 'Magenta',
  '#ffaa00': 'Orange',
  '#aa55ff': 'Purple',
  '#55ff55': 'Spring Green',
  '#55ffff': 'Sky',
  '#ff55ff': 'Hot Pink',
  '#ffaa55': 'Peach',
}

/** @type {readonly {name: string, hex: string}[]} */
export const pebbleColors = steps
  .flatMap((r) =>
    steps.flatMap((g) =>
      steps.map((b) => {
        const hex = `#${r.hex}${g.hex}${b.hex}`
        return {
          hex,
          name: aliases[hex] || `R${r.value} G${g.value} B${b.value}`,
          hsl: hexToHsl(hex),
        }
      }),
    ),
  )
  .sort((a, b) => {
    // Sort by hue, then lightness, then saturation to cluster similar tones
    if (a.hsl.h !== b.hsl.h) return a.hsl.h - b.hsl.h
    if (a.hsl.l !== b.hsl.l) return a.hsl.l - b.hsl.l
    return a.hsl.s - b.hsl.s
  })

export const defaultFill = '#55aaff'
export const defaultStroke = '#000000'

function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h
  const l = (max + min) / 2
  const d = max - min
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  switch (max) {
    case min:
      h = 0
      break
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6
      break
    case g:
      h = ((b - r) / d + 2) / 6
      break
    default:
      h = ((r - g) / d + 4) / 6
      break
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}
