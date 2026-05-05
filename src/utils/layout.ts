import type { SceneNode } from '../store/scene'

export type StageSize = {
  width: number
  height: number
}

export const PLATFORM_SIZES: Record<string, StageSize> = {
  aplite: { width: 144, height: 168 },
  basalt: { width: 144, height: 168 },
  diorite: { width: 144, height: 168 },
  flint: { width: 144, height: 168 },
  chalk: { width: 180, height: 180 },
  emery: { width: 200, height: 228 },
  gabbro: { width: 260, height: 260 },
}

export const ALL_TARGET_PLATFORMS = Object.keys(PLATFORM_SIZES)

export const sameStageSize = (a: StageSize, b: StageSize) => a.width === b.width && a.height === b.height

export const mapNodePosition = <T extends Pick<SceneNode, 'x' | 'y' | 'width' | 'height'>>(
  node: T,
  source: StageSize,
  target: StageSize,
) => {
  if (sameStageSize(source, target)) {
    return { x: node.x, y: node.y }
  }

  const scaleX = target.width / source.width
  const scaleY = target.height / source.height
  const centerX = node.x + node.width / 2
  const centerY = node.y + node.height / 2

  return {
    x: centerX * scaleX - node.width / 2,
    y: centerY * scaleY - node.height / 2,
  }
}

export const unmapNodePosition = <T extends Pick<SceneNode, 'x' | 'y' | 'width' | 'height'>>(
  node: T,
  source: StageSize,
  target: StageSize,
) => mapNodePosition(node, target, source)

export const mapNodeToStage = <T extends SceneNode>(node: T, source: StageSize, target: StageSize): T => ({
  ...node,
  ...mapNodePosition(node, source, target),
})

export const firstPlatformSize = (platforms: string[], fallback: StageSize) => {
  const platform = platforms.find((id) => PLATFORM_SIZES[id])
  return platform ? PLATFORM_SIZES[platform] : fallback
}
