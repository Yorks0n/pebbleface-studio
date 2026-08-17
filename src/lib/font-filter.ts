import type { FontFilter, SceneNode, TextNode, TimeNode } from '../store/scene'

export type FontCharacterCoverage = Set<string> | null

const DIGIT_CHARACTERS = '0123456789: '
const STANDARD_CHARACTERS =
  '0123456789: abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
const EXTENDED_CHARACTERS = `${STANDARD_CHARACTERS},./-`

const charactersForFilter = (filter?: FontFilter) => {
  switch (filter) {
    case 'digits':
      return DIGIT_CHARACTERS
    case 'extended':
      return EXTENDED_CHARACTERS
    case 'none':
      return null
    case 'standard':
    default:
      return STANDARD_CHARACTERS
  }
}

export const customFontUsageKey = (node: TextNode | TimeNode) =>
  node.customFontId ? `${node.customFontId}\u0000${node.fontSize}` : null

export function buildCustomFontCharacterCoverage(nodes: SceneNode[]) {
  const coverage = new Map<string, FontCharacterCoverage>()

  for (const node of nodes) {
    if ((node.type !== 'text' && node.type !== 'time') || !node.customFontId)
      continue
    const key = customFontUsageKey(node)
    if (!key) continue

    const characters = charactersForFilter(node.fontFilter)
    if (!coverage.has(key)) {
      coverage.set(key, characters === null ? null : new Set(characters))
      continue
    }

    const current = coverage.get(key)!
    if (current === null || characters === null) {
      coverage.set(key, null)
      continue
    }
    for (const character of characters) current.add(character)
  }

  return coverage
}

export function characterRegexForCoverage(
  coverage: FontCharacterCoverage | undefined,
) {
  if (coverage === null) return undefined
  if (coverage === undefined) return '[0-9a-zA-Z: ]'

  if (setsEqual(coverage, new Set(DIGIT_CHARACTERS))) return '[0-9: ]'
  if (setsEqual(coverage, new Set(STANDARD_CHARACTERS))) return '[0-9a-zA-Z: ]'
  if (setsEqual(coverage, new Set(EXTENDED_CHARACTERS)))
    return '[0-9a-zA-Z:,.\\/\\- ]'

  const characters = [...coverage]
    .sort()
    .map(escapeCharacterClassCharacter)
    .join('')
  return `[${characters}]`
}

export function filterTextForCoverage(
  text: string,
  coverage: FontCharacterCoverage | undefined,
) {
  if (coverage === null || coverage === undefined) return text
  return [...text].filter((character) => coverage.has(character)).join('')
}

export function unsupportedCharacters(
  text: string,
  coverage: FontCharacterCoverage | undefined,
) {
  if (coverage === null || coverage === undefined) return []
  return [...new Set([...text].filter((character) => !coverage.has(character)))]
}

function setsEqual(left: Set<string>, right: Set<string>) {
  return (
    left.size === right.size &&
    [...left].every((character) => right.has(character))
  )
}

function escapeCharacterClassCharacter(character: string) {
  return character.replace(/[\\\]\-^]/g, '\\$&')
}
