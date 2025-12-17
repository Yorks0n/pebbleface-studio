import { useEffect, useMemo, useRef } from 'react'
import { Layer, Rect, Stage, Text as KonvaText, Image as KonvaImage, Transformer, Line, Circle, Group } from 'react-konva'
import useImage from 'use-image'
import Konva from 'konva'
import {
  useSceneStore,
  type SceneNode,
  getDisplayColor,
  timeFormatOptions,
  type TimeNode,
  normalizeGPathPoints,
  type GPathNode,
} from '../store/scene'
import { useState } from 'react'

type BitmapProps = {
  node: SceneNode & { type: 'bitmap' }
  onSelect: (id: string, evt: Konva.KonvaEventObject<unknown>) => void
  onDragEnd: (id: string, evt: Konva.KonvaEventObject<DragEvent>) => void
  onDragMove: (id: string, evt: Konva.KonvaEventObject<DragEvent>) => void
  onTransformEnd: (id: string) => void
  registerRef: (id: string, el: Konva.Node | null) => void
  draggable: boolean
}

const BitmapShape = ({ node, onSelect, onDragMove, onDragEnd, onTransformEnd, registerRef, draggable }: BitmapProps) => {
  const [img] = useImage(node.dataUrl)
  return (
    <KonvaImage
      ref={(el) => registerRef(node.id, el)}
      image={img || undefined}
      x={node.x}
      y={node.y}
      width={node.width}
      height={node.height}
      rotation={node.rotation}
      draggable={draggable}
      strokeWidth={node.strokeWidth}
      stroke={node.stroke}
      onClick={(e) => onSelect(node.id, e)}
      onTap={(e) => onSelect(node.id, e)}
      onDragMove={(e) => onDragMove(node.id, e)}
      onDragEnd={(e) => onDragEnd(node.id, e)}
      onTransformEnd={() => onTransformEnd(node.id)}
    />
  )
}

export const CanvasStage = () => {
  const {
    nodes,
    selectedIds,
    setSelection,
    updateNode,
    addRect,
    addText,
    addTimeText,
    addGPath,
    appendGPathPoint,
    removeNode,
    tool,
    aplitePreview,
    stage,
    setTool,
  } = useSceneStore()
  const stageRef = useRef<Konva.Stage | null>(null)
  const transformerRef = useRef<Konva.Transformer | null>(null)
  const shapeRefs = useRef<Record<string, Konva.Node | null>>({})
  const [now, setNow] = useState(() => new Date())
  const [activeGPathId, setActiveGPathId] = useState<string | null>(null)
  const backgroundRef = useRef<Konva.Rect | null>(null)
  const closeThreshold = 8

  const scale = 1.8

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(t)
  }, [])

  useEffect(() => {
    if (tool !== 'gpath') {
      setActiveGPathId(null)
    }
  }, [tool])

  const syncTextBounds = (id: string) => {
    const ref = shapeRefs.current[id]
    if (!ref || !(ref instanceof Konva.Text)) return
    const rect = ref.getSelfRect()
    const width = Math.max(4, rect.width)
    const height = Math.max(4, rect.height)
    const node = nodes.find((n) => n.id === id)
    if (!node) return
    if (Math.abs(node.width - width) > 0.5 || Math.abs(node.height - height) > 0.5) {
      updateNode(id, { width, height })
    }
  }

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'OPTION'].includes(target.tagName))) {
        return
      }
      if (e.key === 'Escape') {
        setSelection([])
        return
      }
      if (selectedIds.length === 0) return
      if (e.key === 'Backspace' || e.key === 'Delete') {
        selectedIds.forEach((id) => removeNode(id))
        setSelection([])
        e.preventDefault()
        return
      }
      const step = e.shiftKey ? 10 : 1
      let dx = 0
      let dy = 0
      if (e.key === 'ArrowUp') dy = -step
      else if (e.key === 'ArrowDown') dy = step
      else if (e.key === 'ArrowLeft') dx = -step
      else if (e.key === 'ArrowRight') dx = step
      if (dx === 0 && dy === 0) return
      selectedIds.forEach((id) => {
        const node = nodes.find((n) => n.id === id)
        if (!node) return
        updateNode(id, { x: node.x + dx, y: node.y + dy })
      })
      e.preventDefault()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [nodes, selectedIds, removeNode, setSelection, updateNode])

  const handleSelect = (id: string, evt: Konva.KonvaEventObject<unknown>) => {
    if (tool === 'gpath') {
      evt.cancelBubble = true
      return
    }
    evt.cancelBubble = true
    const rawEvent = evt.evt as MouseEvent | TouchEvent | PointerEvent | undefined
    const isMulti = Boolean(rawEvent && 'shiftKey' in rawEvent && rawEvent.shiftKey)
    if (isMulti) {
      const next = selectedIds.includes(id) ? selectedIds.filter((sid) => sid !== id) : [...selectedIds, id]
      setSelection(next)
    } else {
      setSelection([id])
    }
  }

  const handleSelectClick = (id: string) => (evt: Konva.KonvaEventObject<MouseEvent>) =>
    handleSelect(id, evt)
  const handleSelectTap = (id: string) => (evt: Konva.KonvaEventObject<TouchEvent>) =>
    handleSelect(id, evt)

  const handleDrag = (id: string, evt: Konva.KonvaEventObject<DragEvent>) => {
    updateNode(id, { x: evt.target.x(), y: evt.target.y() })
  }

  const handleTransform = (id: string) => {
    const node = shapeRefs.current[id]
    if (!node) return
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()
    const targetNode = nodes.find((n) => n.id === id)
    if (targetNode && targetNode.type === 'gpath') {
      const lineNode = node as Konva.Line
      const scaledPoints = targetNode.points.map((p) => ({ x: p.x * scaleX, y: p.y * scaleY }))
      const absolutePoints = scaledPoints.map((p) => ({ x: lineNode.x() + p.x, y: lineNode.y() + p.y }))
      const normalized = normalizeGPathPoints(absolutePoints)
      node.scaleX(1)
      node.scaleY(1)
      updateNode(id, {
        x: normalized.origin.x,
        y: normalized.origin.y,
        rotation: node.rotation(),
        width: normalized.width,
        height: normalized.height,
        points: normalized.points,
      })
      return
    }
    const nextWidth = Math.max(4, node.width() * scaleX)
    const nextHeight = Math.max(4, node.height() * scaleY)
    node.scaleX(1)
    node.scaleY(1)
    updateNode(id, {
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
      width: nextWidth,
      height: nextHeight,
    })
  }

  const registerRef = (id: string, el: Konva.Node | null) => {
    shapeRefs.current[id] = el
  }

  useEffect(() => {
    const transformer = transformerRef.current
    if (!transformer) return
    const selectedNodes = selectedIds
      .map((id) => shapeRefs.current[id])
      .filter((node) => node && !(node instanceof Konva.Line && (node as any).attrs?.dataType === 'gpath')) as Konva.Node[]
    transformer.nodes(selectedNodes)
    transformer.getLayer()?.batchDraw()
  }, [selectedIds, nodes])

  useEffect(() => {
    selectedIds.forEach((id) => syncTextBounds(id))
  }, [selectedIds, nodes])

  const onStageMouseDown = (evt: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stageEl = stageRef.current
    const pointer = stageEl?.getPointerPosition()
    if (!stageEl || !pointer) return
    const normalized = { x: pointer.x / scale, y: pointer.y / scale }
    if (tool === 'gpath') {
      const activeExists =
        activeGPathId && nodes.some((n) => n.id === activeGPathId && n.type === 'gpath')
      if (!activeGPathId || !activeExists) {
        const id = addGPath(normalized)
        setActiveGPathId(id)
      } else {
        const node = nodes.find((n): n is GPathNode => n.id === activeGPathId && n.type === 'gpath')
        if (node && node.points.length > 1) {
          const first = { x: node.x + node.points[0].x, y: node.y + node.points[0].y }
          const dist = Math.hypot(normalized.x - first.x, normalized.y - first.y)
          if (dist <= closeThreshold) {
            appendGPathPoint(activeGPathId, first)
            setTool('select')
            setActiveGPathId(null)
            return
          }
        }
        appendGPathPoint(activeGPathId, normalized)
      }
      setTool('gpath')
      return
    }
    const isEmpty = evt.target === stageEl || evt.target === backgroundRef.current
    if (!isEmpty) return
    if (tool === 'rect') addRect(normalized.x - 30, normalized.y - 24)
    else if (tool === 'text') addText(normalized.x - 40, normalized.y - 12)
    else if (tool === 'time') addTimeText(normalized.x - 40, normalized.y - 12)
    else setSelection([])
  }

  const displayNodes = useMemo(() => nodes, [nodes])
  const formatTimeNode = (node: TimeNode) => {
    const options = timeFormatOptions[node.text]
    const fmt = options.find((o) => o.id === node.format) || options[0]
    return fmt ? fmt.formatter(now) : ''
  }

  return (
    <div className="relative flex flex-col items-center gap-3">
      <div className="text-xs uppercase tracking-[0.2em] text-white/70">Canvas 200×228</div>
      <div
        className="glass-panel rounded-2xl p-3"
        style={{
          filter: aplitePreview ? 'grayscale(1) contrast(2)' : 'none',
        }}
      >
        <Stage
          width={stage.width * scale}
          height={stage.height * scale}
          scaleX={scale}
          scaleY={scale}
          ref={stageRef}
          className="bg-[#0b0d12] rounded-xl border border-white/10 shadow-lg shadow-black/40"
          onMouseDown={onStageMouseDown}
          onTouchStart={onStageMouseDown}
        >
          <Layer>
            <Rect
              x={0}
              y={0}
              width={stage.width}
              height={stage.height}
              fill="#05060a"
              cornerRadius={12}
              onClick={() => setSelection([])}
              onTap={() => setSelection([])}
              ref={(el) => {
                backgroundRef.current = el
              }}
            />
            {displayNodes.map((node) => {
              if (node.type === 'rect') {
                return (
                  <Rect
                    key={node.id}
                    ref={(el) => registerRef(node.id, el)}
                    x={node.x}
                    y={node.y}
                    width={node.width}
                    height={node.height}
                    rotation={node.rotation}
                    fill={getDisplayColor(node.fill, aplitePreview)}
                    stroke={getDisplayColor(node.stroke, aplitePreview)}
                    strokeWidth={node.strokeWidth}
                    draggable
                    onClick={handleSelectClick(node.id)}
                    onTap={handleSelectTap(node.id)}
                    onDragMove={(e) => handleDrag(node.id, e)}
                    onDragEnd={(e) => handleDrag(node.id, e)}
                    onTransformEnd={() => handleTransform(node.id)}
                  />
                )
              }
              if (node.type === 'gpath') {
                const selected = selectedIds.includes(node.id)
                const points = node.points.flatMap((p) => [p.x, p.y])
                const baseStroke = Math.max(0.5, node.strokeWidth || 1)
                return (
                  <>
                    <Line
                      key={node.id}
                      ref={(el) => registerRef(node.id, el)}
                      x={node.x}
                      y={node.y}
                      points={points}
                      stroke={getDisplayColor(node.stroke, aplitePreview)}
                      strokeWidth={baseStroke}
                      lineCap="round"
                      lineJoin="round"
                      hitStrokeWidth={12}
                      draggable
                      rotation={node.rotation}
                      onClick={handleSelectClick(node.id)}
                      onTap={handleSelectTap(node.id)}
                      onDragMove={(e) => handleDrag(node.id, e)}
                      onDragEnd={(e) => handleDrag(node.id, e)}
                      onTransformEnd={() => handleTransform(node.id)}
                      dataType="gpath"
                    />
                    {selected && (
                      <Group x={node.x} y={node.y} rotation={node.rotation} listening={false}>
                        <Line
                          points={points}
                          stroke="#0D99FF"
                          strokeWidth={Math.max(0.5, Math.min(1.5, baseStroke))}
                          lineCap="round"
                          lineJoin="round"
                          dash={[8, 6]}
                        />
                        {node.points.map((p, idx) => (
                          <Circle
                            key={`${node.id}-pt-${idx}`}
                            x={p.x}
                            y={p.y}
                            radius={3}
                            fill="#0b0c10"
                            stroke="#0D99FF"
                            strokeWidth={1}
                          />
                        ))}
                      </Group>
                    )}
                  </>
                )
              }
              if (node.type === 'text') {
                return (
                  <KonvaText
                    key={node.id}
                    ref={(el) => registerRef(node.id, el)}
                    x={node.x}
                    y={node.y}
                    width={node.width}
                    height={node.height}
                    text={node.text}
                    fontFamily={node.fontFamily}
                    fontSize={node.fontSize}
                    fill={getDisplayColor(node.fill, aplitePreview)}
                    stroke={getDisplayColor(node.stroke, aplitePreview)}
                    strokeWidth={node.strokeWidth}
                    draggable
                    rotation={node.rotation}
                    padding={4}
                    onClick={handleSelectClick(node.id)}
                    onTap={handleSelectTap(node.id)}
                    onDragMove={(e) => handleDrag(node.id, e)}
                    onDragEnd={(e) => handleDrag(node.id, e)}
                    onTransformEnd={() => handleTransform(node.id)}
                  />
                )
              }
              if (node.type === 'time') {
                return (
                  <KonvaText
                    key={node.id}
                    ref={(el) => registerRef(node.id, el)}
                    x={node.x}
                    y={node.y}
                    width={node.width}
                    height={node.height}
                    text={formatTimeNode(node)}
                    fontFamily={node.fontFamily}
                    fontSize={node.fontSize}
                    fill={getDisplayColor(node.fill, aplitePreview)}
                    stroke={getDisplayColor(node.stroke, aplitePreview)}
                    strokeWidth={node.strokeWidth}
                    draggable
                    rotation={node.rotation}
                    padding={4}
                    onClick={handleSelectClick(node.id)}
                    onTap={handleSelectTap(node.id)}
                    onDragMove={(e) => handleDrag(node.id, e)}
                    onDragEnd={(e) => handleDrag(node.id, e)}
                    onTransformEnd={() => handleTransform(node.id)}
                  />
                )
              }
              return (
                <BitmapShape
                  key={node.id}
                  node={node}
                  onSelect={handleSelect}
                  onDragEnd={handleDrag}
                  onDragMove={handleDrag}
                  onTransformEnd={handleTransform}
                  registerRef={registerRef}
                  draggable
                />
              )
            })}
            <Transformer
              ref={transformerRef}
              rotateEnabled
              anchorSize={8}
              borderStroke="#0D99FF"
              borderStrokeWidth={1}
              anchorStroke="#0D99FF"
              anchorFill="#0b0c10"
            />
          </Layer>
        </Stage>
      </div>
    </div>
  )
}
