import { describe, expect, it } from 'vitest'
import type { SceneNode, TextNode, TimeNode } from '../store/scene'
import {
  buildCustomFontCharacterCoverage,
  characterRegexForCoverage,
  customFontUsageKey,
  filterTextForCoverage,
  unsupportedCharacters,
} from './font-filter'

const baseNode = {
  x: 0,
  y: 0,
  width: 100,
  height: 30,
  rotation: 0,
  stroke: '#000000',
  strokeWidth: 0,
  fill: '#ffffff',
  fontFamily: 'Example',
  fontSize: 24,
  customFontId: 'font-1',
}

const textNode = (fontFilter: TextNode['fontFilter']): TextNode => ({
  ...baseNode,
  id: `text-${fontFilter}`,
  name: 'Text',
  type: 'text',
  text: 'HELLO',
  fontFilter,
})

const timeNode = (fontFilter: TimeNode['fontFilter']): TimeNode => ({
  ...baseNode,
  id: `time-${fontFilter}`,
  name: 'Time',
  type: 'time',
  text: 'time',
  format: 'HH:mm',
  fontFilter,
})

describe('custom font character coverage', () => {
  it('unions filters for nodes using the same custom font and size', () => {
    const nodes: SceneNode[] = [timeNode('digits'), textNode('standard')]
    const coverage = buildCustomFontCharacterCoverage(nodes).get(
      customFontUsageKey(nodes[0] as TimeNode)!,
    )
    const reversedCoverage = buildCustomFontCharacterCoverage(
      [...nodes].reverse(),
    ).get(customFontUsageKey(nodes[0] as TimeNode)!)

    expect(characterRegexForCoverage(coverage)).toBe(
      '[0-9a-zA-Z: ]',
    )
    expect(characterRegexForCoverage(reversedCoverage)).toBe(
      characterRegexForCoverage(coverage),
    )
    expect(filterTextForCoverage('12:AB!', coverage)).toBe('12:AB')
    expect(unsupportedCharacters('12:AB!!', coverage)).toEqual(['!'])
  })

  it('keeps different sizes in separate coverage groups', () => {
    const small = timeNode('digits')
    const large = { ...textNode('extended'), id: 'large', fontSize: 30 }
    const coverage = buildCustomFontCharacterCoverage([small, large])

    expect(coverage.size).toBe(2)
    expect(
      characterRegexForCoverage(coverage.get(customFontUsageKey(small)!)),
    ).toBe('[0-9: ]')
    expect(
      characterRegexForCoverage(coverage.get(customFontUsageKey(large)!)),
    ).toBe('[0-9a-zA-Z:,.\\/\\- ]')
  })

  it('treats None on any shared node as unrestricted for the exported resource', () => {
    const nodes: SceneNode[] = [timeNode('digits'), textNode('none')]
    const coverage = buildCustomFontCharacterCoverage(nodes).get(
      customFontUsageKey(nodes[0] as TimeNode)!,
    )

    expect(coverage).toBeNull()
    expect(characterRegexForCoverage(coverage)).toBeUndefined()
    expect(filterTextForCoverage('任意 text!', coverage)).toBe('任意 text!')
  })
})
