import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Layer, Rect, Stage, Text as KonvaText, Image as KonvaImage, Transformer, Line, Circle, Group } from 'react-konva'
import useImage from 'use-image'
import Konva from 'konva'
import {
  useSceneStore,
  type SceneNode,
  timeFormatOptions,
  type TimeNode,
  type ImageTimeNode,
  normalizeGPathPoints,
  type GPathNode,
  dateParts,
  timeParts,
} from '../store/scene'
import {
  pebbleBwHexFromHex,
  pebbleGrayHexFromTone,
  pebbleGrayToneFromHexUnquantized,
} from '../lib/utils'
import { imageTimeRenderedValue, buildImageTimePositions } from '../lib/image-time'

type BitmapProps = {
  node: SceneNode & { type: 'bitmap' }
  aplitePreview: boolean
  onSelect: (id: string, evt: Konva.KonvaEventObject<unknown>) => void
  onDragEnd: (id: string, evt: Konva.KonvaEventObject<DragEvent>) => void
  onDragMove: (id: string, evt: Konva.KonvaEventObject<DragEvent>) => void
  onTransformEnd: (id: string) => void
  registerRef: (id: string, el: Konva.Node | null) => void
  draggable: boolean
}

type ImageTimeProps = {
  node: ImageTimeNode
  now: Date
  aplitePreview: boolean
  onSelect: (id: string, evt: Konva.KonvaEventObject<unknown>) => void
  onDragEnd: (id: string, evt: Konva.KonvaEventObject<DragEvent>) => void
  onDragMove: (id: string, evt: Konva.KonvaEventObject<DragEvent>) => void
  onTransformEnd: (id: string) => void
  registerRef: (id: string, el: Konva.Node | null) => void
}

type ImageTimeDigitSpriteProps = {
  dataUrl?: string
  x: number
  width: number
  height: number
  aplitePreview: boolean
}

const BitmapShape = ({ node, aplitePreview, onSelect, onDragMove, onDragEnd, onTransformEnd, registerRef, draggable }: BitmapProps) => {
  const [processedPreview, setProcessedPreview] = useState<{ source: string; dataUrl: string } | null>(null)
  const displayStroke = aplitePreview ? pebbleBwHexFromHex(node.stroke) : node.stroke
  const displayDataUrl =
    aplitePreview && processedPreview?.source === node.dataUrl ? processedPreview.dataUrl : node.dataUrl

  useEffect(() => {
    if (!aplitePreview) return

    let cancelled = false
    const sourceDataUrl = node.dataUrl
    const sourceImage = new window.Image()
    sourceImage.onload = () => {
      if (cancelled) return
      const w = Math.max(1, sourceImage.width)
      const h = Math.max(1, sourceImage.height)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        setProcessedPreview({ source: sourceDataUrl, dataUrl: sourceDataUrl })
        return
      }
      ctx.drawImage(sourceImage, 0, 0, w, h)
      const img = ctx.getImageData(0, 0, w, h)
      const data = img.data
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3]
        if (a === 0) continue
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        const brightness = (r + g + b) / 3
        const value = brightness < 127 ? 0 : 255
        data[i] = value
        data[i + 1] = value
        data[i + 2] = value
      }
      ctx.putImageData(img, 0, 0)
      setProcessedPreview({ source: sourceDataUrl, dataUrl: canvas.toDataURL('image/png') })
    }
    sourceImage.onerror = () => {
      if (cancelled) return
      setProcessedPreview({ source: sourceDataUrl, dataUrl: sourceDataUrl })
    }
    sourceImage.src = sourceDataUrl
    return () => {
      cancelled = true
    }
  }, [node.dataUrl, aplitePreview])

  const [img] = useImage(displayDataUrl)
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
      stroke={displayStroke}
      onClick={(e) => onSelect(node.id, e)}
      onTap={(e) => onSelect(node.id, e)}
      onDragMove={(e) => onDragMove(node.id, e)}
      onDragEnd={(e) => onDragEnd(node.id, e)}
      onTransformEnd={() => onTransformEnd(node.id)}
    />
  )
}

const ImageTimeDigitSprite = ({ dataUrl, x, width, height, aplitePreview }: ImageTimeDigitSpriteProps) => {
  const [image] = useImage(dataUrl || '')
  if (image) {
    const fitted = fitBitmapWithinBox(image.width, image.height, width, height)
    return (
      <KonvaImage
        image={image}
        x={x + fitted.offsetX}
        y={fitted.offsetY}
        width={fitted.width}
        height={fitted.height}
        listening={false}
      />
    )
  }
  return (
    <Rect
      x={x}
      y={0}
      width={width}
      height={height}
      stroke={aplitePreview ? '#ffffff' : '#6b7280'}
      dash={[4, 3]}
      listening={false}
    />
  )
}

const ImageTimeShape = ({ node, now, aplitePreview, onSelect, onDragMove, onDragEnd, onTransformEnd, registerRef }: ImageTimeProps) => {
  const rendered = imageTimeRenderedValue(now, node)
  const layout = rendered.type === 'segmented'
    ? buildImageTimePositions(node.width, rendered.parts.length, Math.max(0, node.charSpacing), Math.max(0, node.groupSpacing))
    : null

  return (
    <Group
      ref={(el) => registerRef(node.id, el)}
      x={node.x}
      y={node.y}
      rotation={node.rotation}
      draggable
      onClick={(e) => onSelect(node.id, e)}
      onTap={(e) => onSelect(node.id, e)}
      onDragMove={(e) => onDragMove(node.id, e)}
      onDragEnd={(e) => onDragEnd(node.id, e)}
      onTransformEnd={() => onTransformEnd(node.id)}
    >
      <Rect
        x={0}
        y={0}
        width={node.width}
        height={node.height}
        fill="rgba(0,0,0,0.001)"
        strokeEnabled={false}
      />
      {rendered.type === 'segmented'
        ? rendered.parts.map((char, index) => {
            const asset = node.glyphs.find((item) => item.key === char)
            return (
              <ImageTimeDigitSprite
                key={`${node.id}-${char}-${index}`}
                dataUrl={asset?.dataUrl}
                x={layout?.positions[index] || 0}
                width={layout?.charWidth || node.width}
                height={node.height}
                aplitePreview={aplitePreview}
              />
            )
          })
        : (
          <ImageTimeDigitSprite
            key={`${node.id}-${rendered.key}`}
            dataUrl={node.glyphs.find((item) => item.key === rendered.key)?.dataUrl}
            x={0}
            width={node.width}
            height={node.height}
            aplitePreview={aplitePreview}
          />
        )}
    </Group>
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
    addImageTime,
    addGPath,
    appendGPathPoint,
    removeNode,
    tool,
    aplitePreview,
    stage,
    setTool,
    backgroundColor,
  } = useSceneStore()
  const stageRef = useRef<Konva.Stage | null>(null)
  const transformerRef = useRef<Konva.Transformer | null>(null)
  const shapeRefs = useRef<Record<string, Konva.Node | null>>({})
  const [now, setNow] = useState(() => new Date())
  const [activeGPathId, setActiveGPathId] = useState<string | null>(null)
  const backgroundRef = useRef<Konva.Rect | null>(null)
  const closeThreshold = 8

  const scale = 1.8

  const getFillProps = (color: string) => {
    if (!aplitePreview) return { fill: color }
    const tone = pebbleGrayToneFromHexUnquantized(color)
    return { fill: pebbleGrayHexFromTone(tone) }
  }

  const getBwColor = (color: string) => {
    if (!aplitePreview) return color
    return pebbleBwHexFromHex(color)
  }

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(t)
  }, [])

  const formatTimeNode = useCallback((node: TimeNode) => {
    if (node.format === 'custom') {
      if (node.text === 'time') {
        return timeParts(now, node.customFormat || '')
      }
      return dateParts(now, node.customFormat || '')
    }
    const options = timeFormatOptions[node.text]
    const fmt = options.find((o) => o.id === node.format) || options[0]
    return fmt ? fmt.formatter(now) : ''
  }, [now])

  const syncTextBounds = useCallback((id: string) => {
    const node = nodes.find((n) => n.id === id)
    if (!node || (node.type !== 'text' && node.type !== 'time')) return
    const text = node.type === 'time' ? formatTimeNode(node) : node.text
    const measured = new Konva.Text({
      text,
      fontFamily: node.fontFamily,
      fontSize: node.fontSize,
      padding: 4,
    })
    const width = Math.max(4, Math.ceil(measured.getWidth()))
    const height = Math.max(4, Math.ceil(measured.getHeight()))
    measured.destroy()
    if (Math.abs(node.width - width) > 0.5 || Math.abs(node.height - height) > 0.5) {
      updateNode(id, { width, height })
    }
  }, [formatTimeNode, nodes, updateNode])

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
    if (targetNode && targetNode.type === 'image-time') {
      const groupNode = node as Konva.Group
      const nextWidth = Math.max(16, targetNode.width * scaleX)
      const nextHeight = Math.max(4, targetNode.height * scaleY)
      node.scaleX(1)
      node.scaleY(1)
      updateNode(id, {
        x: groupNode.x(),
        y: groupNode.y(),
        rotation: groupNode.rotation(),
        width: nextWidth,
        height: nextHeight,
        charSpacing: Math.max(0, targetNode.charSpacing * scaleX),
        groupSpacing: Math.max(0, targetNode.groupSpacing * scaleX),
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
      .filter((node) => node && !(node instanceof Konva.Line && node.getAttr('dataType') === 'gpath')) as Konva.Node[]
    transformer.nodes(selectedNodes)
    transformer.getLayer()?.batchDraw()
  }, [selectedIds, nodes])

  useEffect(() => {
    const handleFontLoad = () => {
      stageRef.current?.getLayers().forEach((l) => l.batchDraw())
      nodes.forEach((node) => {
        if (node.type === 'text' || node.type === 'time') syncTextBounds(node.id)
      })
    }
    document.fonts?.addEventListener('loadingdone', handleFontLoad)
    return () => {
      document.fonts?.removeEventListener('loadingdone', handleFontLoad)
    }
  }, [nodes, syncTextBounds])

  useEffect(() => {
    nodes.forEach((node) => {
      if (node.type === 'text' || node.type === 'time') syncTextBounds(node.id)
    })
  }, [nodes, now, syncTextBounds])

  const onStageMouseDown = (evt: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stageEl = stageRef.current
    const pointer = stageEl?.getPointerPosition()
    if (!stageEl || !pointer) return
    const normalized = { x: pointer.x / scale, y: pointer.y / scale }
    if (tool === 'gpath') {
      const currentActiveGPathId =
        activeGPathId && selectedIds.includes(activeGPathId)
          ? activeGPathId
          : null
      const activeExists =
        currentActiveGPathId && nodes.some((n) => n.id === currentActiveGPathId && n.type === 'gpath')
      if (!currentActiveGPathId || !activeExists) {
        const id = addGPath(normalized)
        setActiveGPathId(id)
      } else {
        const node = nodes.find((n): n is GPathNode => n.id === currentActiveGPathId && n.type === 'gpath')
        if (node && node.points.length > 1) {
          const first = { x: node.x + node.points[0].x, y: node.y + node.points[0].y }
          const dist = Math.hypot(normalized.x - first.x, normalized.y - first.y)
          if (dist <= closeThreshold) {
            appendGPathPoint(currentActiveGPathId, first)
            setTool('select')
            setActiveGPathId(null)
            return
          }
        }
        appendGPathPoint(currentActiveGPathId, normalized)
      }
      setTool('gpath')
      return
    }
    const isEmpty = evt.target === stageEl || evt.target === backgroundRef.current
    if (!isEmpty) return
    if (tool === 'rect') addRect(normalized.x - 30, normalized.y - 24)
    else if (tool === 'text') addText(normalized.x - 40, normalized.y - 12)
    else if (tool === 'time') addTimeText(normalized.x - 40, normalized.y - 12)
    else if (tool === 'image-time') addImageTime(normalized.x - 58, normalized.y - 16)
    else setSelection([])
  }

  const displayNodes = useMemo(() => nodes, [nodes])

  return (
    <div className="relative flex flex-col items-center gap-3">
      <div className="text-xs uppercase tracking-[0.2em] text-black/70">Canvas {stage.width}×{stage.height}</div>
      <div
        className="retro-panel p-3"
      >
        <Stage
          width={stage.width * scale}
          height={stage.height * scale}
          scaleX={scale}
          scaleY={scale}
          ref={stageRef}
          className="bg-[#0b0d12] border-2 border-[#333] shadow-none"
          onMouseDown={onStageMouseDown}
          onTouchStart={onStageMouseDown}
        >
          <Layer>
            <Rect
              x={0}
              y={0}
              width={stage.width}
              height={stage.height}
              {...getFillProps(backgroundColor)}
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
                    {...getFillProps(node.fill)}
                    stroke={getBwColor(node.stroke)}
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
                  <Fragment key={node.id}>
                    <Line
                      ref={(el) => registerRef(node.id, el)}
                      x={node.x}
                      y={node.y}
                      points={points}
                      stroke={getBwColor(node.stroke)}
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
                  </Fragment>
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
                    fill={getBwColor(node.fill)}
                    stroke={getBwColor(node.stroke)}
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
                    fill={getBwColor(node.fill)}
                    stroke={getBwColor(node.stroke)}
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
              if (node.type === 'image-time') {
                return (
                  <ImageTimeShape
                    key={node.id}
                    node={node}
                    now={now}
                    aplitePreview={aplitePreview}
                    onSelect={handleSelect}
                    onDragEnd={handleDrag}
                    onDragMove={handleDrag}
                    onTransformEnd={handleTransform}
                    registerRef={registerRef}
                  />
                )
              }
              return (
                <BitmapShape
                  key={node.id}
                  node={node}
                  aplitePreview={aplitePreview}
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


function fitBitmapWithinBox(sourceWidth: number, sourceHeight: number, maxWidth: number, maxHeight: number) {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return { width: maxWidth, height: maxHeight, offsetX: 0, offsetY: 0 }
  }
  const scale = Math.min(1, maxWidth / sourceWidth, maxHeight / sourceHeight)
  const width = Math.max(1, sourceWidth * scale)
  const height = Math.max(1, sourceHeight * scale)
  return {
    width,
    height,
    offsetX: (maxWidth - width) / 2,
    offsetY: (maxHeight - height) / 2,
  }
}
