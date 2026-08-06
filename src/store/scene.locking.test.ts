import { beforeEach, describe, expect, it } from 'vitest'
import { useSceneStore, type ProjectFile, type RectNode } from './scene'

const rectNode = (id: string, locked?: boolean): RectNode => ({
  id,
  name: id,
  type: 'rect',
  locked,
  x: 10,
  y: 12,
  width: 20,
  height: 24,
  rotation: 0,
  fill: '#ffffff',
  stroke: '#000000',
  strokeWidth: 1,
})

const projectFile = (scene: ProjectFile['scene']): ProjectFile => ({
  fileType: 'pebble-face-studio-project',
  version: 1,
  timestamp: 0,
  meta: {
    name: 'locking-test',
    uuid: '00000000-0000-0000-0000-000000000000',
    targetPlatforms: ['basalt'],
    dimensions: { width: 144, height: 168 },
    backgroundColor: '#000000',
  },
  resources: { fonts: [] },
  scene,
})

beforeEach(() => {
  useSceneStore.setState({
    nodes: [],
    selectedIds: [],
    isInitialized: true,
  })
})

describe('scene node locking', () => {
  it('toggles the locked state without changing selection', () => {
    useSceneStore.setState({ nodes: [rectNode('rect-1')], selectedIds: ['rect-1'] })

    useSceneStore.getState().toggleNodeLock('rect-1')
    expect(useSceneStore.getState().nodes[0].locked).toBe(true)
    expect(useSceneStore.getState().selectedIds).toEqual(['rect-1'])

    useSceneStore.getState().toggleNodeLock('rect-1')
    expect(useSceneStore.getState().nodes[0].locked).toBe(false)
  })

  it('blocks edits, deletion and reordering until the node is unlocked', () => {
    useSceneStore.setState({
      nodes: [rectNode('locked', true), rectNode('other')],
      selectedIds: ['locked'],
    })

    useSceneStore.getState().updateNode('locked', { x: 99 })
    useSceneStore.getState().moveLayer('locked', 'top')
    useSceneStore.getState().removeNode('locked')

    expect(useSceneStore.getState().nodes.map((node) => node.id)).toEqual(['locked', 'other'])
    expect(useSceneStore.getState().nodes[0].x).toBe(10)

    useSceneStore.getState().toggleNodeLock('locked')
    useSceneStore.getState().updateNode('locked', { x: 99 })
    useSceneStore.getState().moveLayer('locked', 'top')

    expect(useSceneStore.getState().nodes.map((node) => node.id)).toEqual(['other', 'locked'])
    expect(useSceneStore.getState().nodes[1].x).toBe(99)

    useSceneStore.getState().removeNode('locked')
    expect(useSceneStore.getState().nodes.map((node) => node.id)).toEqual(['other'])
  })

  it('restores locked nodes and defaults legacy nodes to unlocked', async () => {
    await useSceneStore.getState().loadProject(
      projectFile([rectNode('locked', true), rectNode('legacy')]),
    )

    expect(useSceneStore.getState().nodes.map((node) => node.locked)).toEqual([true, false])
  })
})
