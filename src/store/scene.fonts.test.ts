import { describe, expect, it } from 'vitest'
import { useSceneStore } from './scene'

describe('custom font uploads', () => {
  it('rejects non-TTF files before attempting to load them', async () => {
    const invalidFont = { name: 'display-font.otf' } as File

    await expect(
      useSceneStore.getState().addCustomFont(invalidFont),
    ).rejects.toThrow('Only TrueType (.ttf) fonts are supported by Pebble.')
  })
})
