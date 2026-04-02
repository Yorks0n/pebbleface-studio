import { describe, it, expect, beforeEach } from 'vitest'
import { useSceneStore } from './scene'
import type { ProjectFile } from './scene'

// Minimal project file factory
function projectFile(overrides: Partial<ProjectFile> = {}): ProjectFile {
  return {
    fileType: 'pebble-face-studio-project',
    version: 1,
    timestamp: 0,
    meta: {
      name: 'test',
      uuid: '00000000-0000-0000-0000-000000000000',
      targetPlatforms: ['basalt'],
      dimensions: { width: 144, height: 168 },
      backgroundColor: '#000000',
    },
    resources: { fonts: [] },
    scene: [],
    ...overrides,
  }
}

beforeEach(() => {
  // Reset store to initial state between tests
  useSceneStore.setState({
    nodes: [],
    selectedIds: [],
    isInitialized: false,
    projectName: '',
  })
})

describe('loadProject — ImageTimeNode backwards compatibility', () => {
  it('new format: glyphs field loads directly with uppercase keys', async () => {
    await useSceneStore.getState().loadProject(
      projectFile({
        scene: [
          {
            id: 'n1',
            name: 'digits',
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
            charSpacing: 2,
            groupSpacing: 4,
            glyphs: [
              { key: '0', dataUrl: 'data:image/png;base64,abc', fileName: '0.png' },
              { key: 'a', dataUrl: 'data:image/png;base64,def', fileName: 'a.png' },
            ],
          },
        ],
      }),
    )

    const nodes = useSceneStore.getState().nodes
    expect(nodes).toHaveLength(1)
    const n = nodes[0]
    if (n.type !== 'image-time') throw new Error('expected image-time node')
    expect(n.glyphs).toHaveLength(2)
    expect(n.glyphs[0].key).toBe('0')
    expect(n.glyphs[1].key).toBe('A') // lowercase 'a' → uppercased to 'A'
  })

  it('old format: digits field → glyphs with uppercase keys', async () => {
    const oldFormatNode = {
      id: 'n1',
      name: 'clock',
      type: 'image-time' as const,
      x: 0,
      y: 0,
      width: 100,
      height: 40,
      rotation: 0,
      stroke: '#000000',
      strokeWidth: 1,
      mode: 'time' as const,
      timeFormat: '24h' as const,
      dateFormat: 'MM' as const,
      weekFormat: 'letters' as const,
      charSpacing: 2,
      groupSpacing: 4,
      // old field name — no `glyphs`, has `digits` instead
      digits: [
        { digit: '0', dataUrl: 'data:image/png;base64,aaa', fileName: 'zero.png' },
        { digit: '5', dataUrl: 'data:image/png;base64,bbb', fileName: 'five.png' },
        { digit: 'mon', dataUrl: 'data:image/png;base64,ccc', fileName: 'mon.png' },
      ],
      glyphs: undefined as unknown as [],
    }

    await useSceneStore.getState().loadProject(
      projectFile({ scene: [oldFormatNode] }),
    )

    const nodes = useSceneStore.getState().nodes
    expect(nodes).toHaveLength(1)
    const n = nodes[0]
    if (n.type !== 'image-time') throw new Error('expected image-time node')

    expect(n.glyphs).toHaveLength(3)
    expect(n.glyphs[0]).toMatchObject({ key: '0', dataUrl: 'data:image/png;base64,aaa', fileName: 'zero.png' })
    expect(n.glyphs[1]).toMatchObject({ key: '5', dataUrl: 'data:image/png;base64,bbb', fileName: 'five.png' })
    expect(n.glyphs[2]).toMatchObject({ key: 'MON', dataUrl: 'data:image/png;base64,ccc', fileName: 'mon.png' }) // lowercased 'mon' → uppercase 'MON'
  })

  it('old format: empty digits array → empty glyphs', async () => {
    const oldFormatNode = {
      id: 'n2',
      name: 'clock2',
      type: 'image-time' as const,
      x: 0,
      y: 0,
      width: 100,
      height: 40,
      rotation: 0,
      stroke: '#000000',
      strokeWidth: 1,
      mode: 'time' as const,
      timeFormat: '24h' as const,
      dateFormat: 'MM' as const,
      weekFormat: 'letters' as const,
      charSpacing: 2,
      groupSpacing: 4,
      digits: [],
      glyphs: undefined as unknown as [],
    }

    await useSceneStore.getState().loadProject(projectFile({ scene: [oldFormatNode] }))

    const n = useSceneStore.getState().nodes[0]
    if (n.type !== 'image-time') throw new Error('expected image-time node')
    expect(n.glyphs).toHaveLength(0)
  })

  it('old format: neither glyphs nor digits → empty glyphs', async () => {
    const bareNode = {
      id: 'n3',
      name: 'bare',
      type: 'image-time' as const,
      x: 0,
      y: 0,
      width: 100,
      height: 40,
      rotation: 0,
      stroke: '#000000',
      strokeWidth: 1,
      mode: 'time' as const,
      timeFormat: '24h' as const,
      dateFormat: 'MM' as const,
      weekFormat: 'letters' as const,
      charSpacing: 0,
      groupSpacing: 0,
      glyphs: undefined as unknown as [],
    }

    await useSceneStore.getState().loadProject(projectFile({ scene: [bareNode] }))

    const n = useSceneStore.getState().nodes[0]
    if (n.type !== 'image-time') throw new Error('expected image-time node')
    expect(n.glyphs).toHaveLength(0)
  })

  it('default field values are applied for missing mode/format fields', async () => {
    const minimalNode = {
      id: 'n4',
      name: 'min',
      type: 'image-time' as const,
      x: 0,
      y: 0,
      width: 100,
      height: 40,
      rotation: 0,
      stroke: '#000000',
      strokeWidth: 1,
      charSpacing: 0,
      groupSpacing: 0,
      glyphs: [],
      // omit mode, timeFormat, dateFormat, weekFormat
    } as unknown as import('./scene').SceneNode

    await useSceneStore.getState().loadProject(projectFile({ scene: [minimalNode] }))

    const n = useSceneStore.getState().nodes[0]
    if (n.type !== 'image-time') throw new Error('expected image-time node')
    expect(n.mode).toBe('time')
    expect(n.timeFormat).toBe('24h')
    expect(n.dateFormat).toBe('MM')
    expect(n.weekFormat).toBe('letters')
  })
})
