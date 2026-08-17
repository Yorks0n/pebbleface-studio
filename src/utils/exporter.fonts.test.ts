import JSZip from 'jszip'
import { beforeEach, describe, expect, it } from 'vitest'
import type { SceneNode, TextNode, TimeNode } from '../store/scene'
import { useSceneStore } from '../store/scene'
import { generatePebbleProjectZip } from './exporter'

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

const textNode: TextNode = {
  ...baseNode,
  id: 'text-1',
  name: 'Text',
  type: 'text',
  text: 'HELLO',
  fontFilter: 'standard',
}

const timeNode: TimeNode = {
  ...baseNode,
  id: 'time-1',
  name: 'Time',
  type: 'time',
  text: 'time',
  format: 'HH:mm',
  fontFilter: 'digits',
}

beforeEach(() => {
  useSceneStore.setState({
    nodes: [],
    customFonts: [
      {
        id: 'font-1',
        name: 'Example',
        file: new File([new Uint8Array([0])], 'Example.ttf', {
          type: 'font/ttf',
        }),
        dataUrl: 'data:font/ttf;base64,AA==',
      },
    ],
    targetPlatforms: ['basalt'],
    projectUuid: '00000000-0000-4000-8000-000000000000',
  })
})

describe('custom font export', () => {
  it('writes one order-independent union for a shared font and size', async () => {
    const nodes: SceneNode[] = [timeNode, textNode]
    const forward = await exportedFontResource(nodes)
    const reversed = await exportedFontResource([...nodes].reverse())

    expect(forward).toEqual(reversed)
    expect(forward).toMatchObject({
      type: 'font',
      name: 'FONT_EXAMPLE_24',
      characterRegex: '[0-9a-zA-Z: ]',
    })
  })
})

async function exportedFontResource(nodes: SceneNode[]) {
  const { blob } = await generatePebbleProjectZip(nodes, 'font-test')
  const zip = await JSZip.loadAsync(await blob.arrayBuffer())
  const packageJson = JSON.parse(
    await zip.file('package.json')!.async('string'),
  ) as {
    pebble: { resources: { media: unknown[] } }
  }
  return packageJson.pebble.resources.media[0]
}
