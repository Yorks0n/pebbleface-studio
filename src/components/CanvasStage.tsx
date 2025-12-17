import { useEffect, useMemo, useRef } from 'react'
import { Layer, Rect, Stage, Text as KonvaText, Image as KonvaImage, Transformer } from 'react-konva'
import useImage from 'use-image'
import type Konva from 'konva'
import { useSceneStore, type SceneNode, getDisplayColor, timeFormatOptions, type TimeNode } from '../store/scene'
import { useState } from 'react'

type BitmapProps = {
  node: SceneNode & { type: 'bitmap' }
  onSelect: (id: string, evt: Konva.KonvaEventObject<unknown>) => void
  onDragEnd: (id: string, evt: Konva.KonvaEventObject<DragEvent>) => void
  onTransformEnd: (id: string) => void
  registerRef: (id: string, el: Konva.Node | null) => void
  draggable: boolean
}

const BitmapShape = ({ node, onSelect, onDragEnd, onTransformEnd, registerRef, draggable }: BitmapProps) => {
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
    tool,
    aplitePreview,
    stage,
  } = useSceneStore()
  const stageRef = useRef<Konva.Stage | null>(null)
  const transformerRef = useRef<Konva.Transformer | null>(null)
  const shapeRefs = useRef<Record<string, Konva.Node | null>>({})
  const [now, setNow] = useState(() => new Date())

  const scale = 1.8

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(t)
  }, [])

  const handleSelect = (id: string, evt: Konva.KonvaEventObject<unknown>) => {
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
    const selectedNodes = selectedIds.map((id) => shapeRefs.current[id]).filter(Boolean) as Konva.Node[]
    transformer.nodes(selectedNodes)
    transformer.getLayer()?.batchDraw()
  }, [selectedIds, nodes])

  const onStageMouseDown = (evt: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stageEl = stageRef.current
    const pointer = stageEl?.getPointerPosition()
    if (!stageEl || !pointer) return
    const isEmpty = evt.target === stageEl
    const normalized = { x: pointer.x / scale, y: pointer.y / scale }
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
          className="bg-[#11131a] rounded-xl border border-white/5"
          onMouseDown={onStageMouseDown}
          onTouchStart={onStageMouseDown}
        >
          <Layer>
            <Rect x={0} y={0} width={stage.width} height={stage.height} fill="#05060a" cornerRadius={12} />
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
                    onDragEnd={(e) => handleDrag(node.id, e)}
                    onTransformEnd={() => handleTransform(node.id)}
                  />
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
              borderStroke="#7c3aed"
              borderStrokeWidth={1}
              anchorStroke="#7c3aed"
              anchorFill="#0b0c10"
            />
          </Layer>
        </Stage>
      </div>
    </div>
  )
}
