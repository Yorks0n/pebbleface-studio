import { useEffect, useRef, useState } from 'react'
import { Stage, Layer, Image as KonvaImage, Rect, Transformer } from 'react-konva'
import useImage from 'use-image'
import { Check, X } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'

interface ImageImportDialogProps {
  isOpen: boolean
  file: File | null
  onClose: () => void
  onConfirm: (croppedImage: string, width: number, height: number) => void
}

const PRESETS = [
  { label: 'Aplite/Basalt (144x168)', w: 144, h: 168 },
  { label: 'Chalk (180x180)', w: 180, h: 180 },
  { label: 'Emery (200x228)', w: 200, h: 228 },
  { label: 'Icon (28x28)', w: 28, h: 28 },
]

export const ImageImportDialog = ({ isOpen, file, onClose, onConfirm }: ImageImportDialogProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [image] = useImage(imageUrl || '', 'anonymous')
  
  // Crop state (in original image coordinates)
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 100, height: 100 })
  
  // Stage sizing
  const [stageSize, setStageSize] = useState({ width: 500, height: 400 })
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Transformer reference
  const trRef = useRef<any>(null)
  const shapeRef = useRef<any>(null)

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file)
      setImageUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [file])

  useEffect(() => {
    if (image) {
      // Initialize crop to full image or reasonable default
      const initialW = Math.min(image.width, 144)
      const initialH = Math.min(image.height, 168)
      setCrop({
        x: (image.width - initialW) / 2,
        y: (image.height - initialH) / 2,
        width: initialW,
        height: initialH,
      })
    }
  }, [image])

  // Update selection transformer when crop changes
  useEffect(() => {
    if (isOpen && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current])
      trRef.current.getLayer().batchDraw()
    }
  }, [isOpen, crop])

  // Handle resizing the stage based on container
  useEffect(() => {
    if (containerRef.current) {
      setStageSize({
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight
      })
    }
  }, [isOpen])

  if (!isOpen || !file || !imageUrl || !image) return null

  // Calculate scale to fit image in stage
  const scaleX = stageSize.width / image.width
  const scaleY = stageSize.height / image.height
  const scale = Math.min(scaleX, scaleY, 1) // Don't upscale
  
  // Centering offset
  const offsetX = (stageSize.width - image.width * scale) / 2
  const offsetY = (stageSize.height - image.height * scale) / 2

  const handleConfirm = () => {
    // Create a temporary canvas to perform the crop
    const canvas = document.createElement('canvas')
    canvas.width = crop.width
    canvas.height = crop.height
    const ctx = canvas.getContext('2d')
    
    if (ctx && image) {
      ctx.drawImage(
        image,
        crop.x, crop.y, crop.width, crop.height, // Source
        0, 0, crop.width, crop.height // Dest
      )
      const resultDataUrl = canvas.toDataURL(file.type || 'image/png')
      onConfirm(resultDataUrl, crop.width, crop.height)
      onClose()
    }
  }

  const applyPreset = (w: number, h: number) => {
    setCrop(prev => ({
      ...prev,
      width: Math.min(w, image.width),
      height: Math.min(h, image.height)
    }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#1a1b1e] w-[90vw] max-w-4xl h-[80vh] rounded-xl overflow-hidden flex shadow-2xl border border-white/10">
        
        {/* Left: Canvas Area */}
        <div className="flex-1 bg-[#101010] relative overflow-hidden" ref={containerRef}>
          <Stage width={stageSize.width} height={stageSize.height}>
            <Layer>
              {/* Background Image */}
              <KonvaImage
                image={image}
                x={offsetX}
                y={offsetY}
                scaleX={scale}
                scaleY={scale}
                opacity={0.5} // Dim the full image
              />
              
              {/* Highlighted Crop Area (Image clipped) - Optional, simpler to just use a rectangle outline */}
              <KonvaImage
                image={image}
                x={offsetX}
                y={offsetY}
                scaleX={scale}
                scaleY={scale}
                crop={{
                  x: crop.x,
                  y: crop.y,
                  width: crop.width,
                  height: crop.height
                }}
              />
              
              {/* Crop Rectangle */}
              <Rect
                ref={shapeRef}
                x={offsetX + crop.x * scale}
                y={offsetY + crop.y * scale}
                width={crop.width * scale}
                height={crop.height * scale}
                stroke="#00f1ff"
                strokeWidth={1 / scale}
                dash={[4 / scale, 4 / scale]}
                draggable
                onDragMove={(e) => {
                  // Constrain drag within image bounds
                  let newX = (e.target.x() - offsetX) / scale
                  let newY = (e.target.y() - offsetY) / scale
                  
                  // Clamp
                  newX = Math.max(0, Math.min(newX, image.width - crop.width))
                  newY = Math.max(0, Math.min(newY, image.height - crop.height))

                  setCrop(prev => ({ ...prev, x: newX, y: newY }))
                  
                  // Reset visual position to match clamped state
                  e.target.x(offsetX + newX * scale)
                  e.target.y(offsetY + newY * scale)
                }}
                onTransform={() => {
                  const node = shapeRef.current
                  const scaleX = node.scaleX()
                  const scaleY = node.scaleY()
                  
                  // Reset scale to 1 and update width/height instead
                  node.scaleX(1)
                  node.scaleY(1)
                  
                  const newWidth = Math.max(5, node.width() * scaleX)
                  const newHeight = Math.max(5, node.height() * scaleY)
                  
                  const newX = (node.x() - offsetX) / scale
                  const newY = (node.y() - offsetY) / scale

                  setCrop({
                    x: Math.max(0, newX),
                    y: Math.max(0, newY),
                    width: newWidth / scale, // Convert back to image coords
                    height: newHeight / scale
                  })
                }}
              />
              <Transformer
                ref={trRef}
                rotateEnabled={false}
                boundBoxFunc={(oldBox, newBox) => {
                  // Limit resize to image bounds would be nice, but simple clamp is ok
                  if (newBox.width < 5 || newBox.height < 5) return oldBox
                  return newBox
                }}
              />
            </Layer>
          </Stage>
        </div>

        {/* Right: Controls */}
        <div className="w-80 bg-[#1e1e1e] border-l border-white/10 p-6 flex flex-col gap-6 overflow-y-auto">
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Import Image</h2>
            <p className="text-sm text-white/50">Adjust crop region before importing.</p>
          </div>

          {/* Size Inputs */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Width (px)</Label>
                <Input
                  type="number"
                  value={Math.round(crop.width)}
                  onChange={(e) => setCrop(c => ({ ...c, width: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Height (px)</Label>
                <Input
                  type="number"
                  value={Math.round(crop.height)}
                  onChange={(e) => setCrop(c => ({ ...c, height: Number(e.target.value) }))}
                />
              </div>
            </div>
             <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>X</Label>
                <Input
                  type="number"
                  value={Math.round(crop.x)}
                  onChange={(e) => setCrop(c => ({ ...c, x: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Y</Label>
                <Input
                  type="number"
                  value={Math.round(crop.y)}
                  onChange={(e) => setCrop(c => ({ ...c, y: Number(e.target.value) }))}
                />
              </div>
            </div>
          </div>

          {/* Presets */}
          <div className="space-y-2">
            <Label>Quick Presets</Label>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map(p => (
                <Button 
                  key={p.label} 
                  variant="outline" 
                  size="sm" 
                  className="justify-start h-auto py-2 px-3 text-xs"
                  onClick={() => applyPreset(p.w, p.h)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex-1" />

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-white/10">
            <Button variant="ghost" className="flex-1" onClick={onClose}>
              <X size={16} /> Cancel
            </Button>
            <Button className="flex-1" onClick={handleConfirm}>
              <Check size={16} /> Import
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
