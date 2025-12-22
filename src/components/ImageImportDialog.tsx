import { useEffect, useRef, useState } from 'react'
import { Stage, Layer, Image as KonvaImage, Rect, Path } from 'react-konva'
import useImage from 'use-image'
import Konva from 'konva'
import { Check, X, ZoomIn, ZoomOut } from 'lucide-react'
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
  
  // Target output size (The fixed viewport)
  const [targetSize, setTargetSize] = useState({ width: 144, height: 168 })
  
  // Image transformation state
  const [imgState, setImgState] = useState({ x: 0, y: 0, scale: 1 })
  
  // Stage sizing
  const [stageSize, setStageSize] = useState({ width: 500, height: 400 })
  const containerRef = useRef<HTMLDivElement>(null)
  
  const imageLayerRef = useRef<Konva.Layer>(null)
  const overlayLayerRef = useRef<Konva.Layer>(null)

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file)
      setImageUrl(url)
      // Reset image state when new file loads
      setImgState({ x: 0, y: 0, scale: 1 })
      return () => URL.revokeObjectURL(url)
    }
  }, [file])

  useEffect(() => {
    if (image) {
      // Fit image into target size initially? Or just center it at 100%?
      // Let's center it.
      // Reset is handled in file effect, but if image object loads later:
      setImgState(prev => ({ ...prev, x: 0, y: 0 }))
    }
  }, [image])

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

  // Calculated geometry
  const stageCenterX = stageSize.width / 2
  const stageCenterY = stageSize.height / 2
  
  // The viewport rect (centered on stage)
  const vpX = stageCenterX - targetSize.width / 2
  const vpY = stageCenterY - targetSize.height / 2

  // Overlay Path Data (Rectangle with hole)
  // Outer rectangle: 0 0 width height
  // Inner rectangle: vpX vpY targetSize.width targetSize.height
  const overlayPath = `
    M 0 0 
    H ${stageSize.width} 
    V ${stageSize.height} 
    H 0 
    Z 
    M ${vpX} ${vpY} 
    h ${targetSize.width} 
    v ${targetSize.height} 
    h -${targetSize.width} 
    z
  `

  const handleConfirm = () => {
    if (!imageLayerRef.current) return

    // Hide overlay just in case (though it is on separate layer)
    if (overlayLayerRef.current) overlayLayerRef.current.hide()
    
    // Capture the area defined by the viewport
    const dataUrl = imageLayerRef.current.toDataURL({
      x: vpX,
      y: vpY,
      width: targetSize.width,
      height: targetSize.height,
      pixelRatio: 1, // Ensure 1:1 pixel mapping for accurate size
      mimeType: 'image/png'
    })

    if (overlayLayerRef.current) overlayLayerRef.current.show()

    onConfirm(dataUrl, targetSize.width, targetSize.height)
    onClose()
  }

  const applyPreset = (w: number, h: number) => {
    setTargetSize({ width: w, height: h })
  }

  const handleWheel = (e: any) => {
    e.evt.preventDefault()
    const scaleBy = 1.05
    const oldScale = imgState.scale
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy
    // Limit scale
    const clampedScale = Math.min(Math.max(0.1, newScale), 10)
    setImgState(prev => ({ ...prev, scale: clampedScale }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#1a1b1e] w-[90vw] max-w-4xl h-[80vh] rounded-xl overflow-hidden flex shadow-2xl border border-white/10">
        
        {/* Left: Canvas Area */}
        <div className="flex-1 bg-[#101010] relative overflow-hidden flex flex-col" ref={containerRef}>
          <div className="absolute top-4 left-4 z-10 bg-black/50 px-3 py-1.5 rounded-md text-xs text-white/70 pointer-events-none backdrop-blur-sm">
            Scroll to zoom • Drag to move
          </div>
          
          <Stage 
            width={stageSize.width} 
            height={stageSize.height}
            onWheel={handleWheel}
          >
            <Layer ref={imageLayerRef}>
              {/* Checkboard pattern for transparency (Optional, keep simple for now) */}
              
              <KonvaImage
                image={image}
                // Center the image anchor
                offset={{ x: image.width / 2, y: image.height / 2 }}
                // Position at center of stage + user offset
                x={stageCenterX + imgState.x}
                y={stageCenterY + imgState.y}
                scaleX={imgState.scale}
                scaleY={imgState.scale}
                draggable
                onDragMove={(e) => {
                  setImgState(prev => ({
                    ...prev,
                    x: e.target.x() - stageCenterX,
                    y: e.target.y() - stageCenterY
                  }))
                }}
              />
            </Layer>
            
            <Layer ref={overlayLayerRef} listening={false}>
              {/* Dark Overlay with hole */}
              <Path
                data={overlayPath}
                fill="rgba(0,0,0,0.7)"
                fillRule="evenodd"
              />
              {/* Border for the hole */}
              <Rect
                x={vpX}
                y={vpY}
                width={targetSize.width}
                height={targetSize.height}
                stroke="#00f1ff"
                strokeWidth={1}
                dash={[4, 4]}
              />
            </Layer>
          </Stage>
          
          {/* Zoom Controls Overlay */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-[#1e1e1e] px-4 py-2 rounded-full border border-white/10 shadow-xl">
             <ZoomOut size={16} className="text-white/70" />
             <input 
               type="range" 
               min="0.1" 
               max="3" 
               step="0.01" 
               value={imgState.scale}
               onChange={(e) => setImgState(prev => ({ ...prev, scale: parseFloat(e.target.value) }))}
               className="w-32 accent-[#00f1ff] h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
             />
             <ZoomIn size={16} className="text-white/70" />
             <span className="text-xs text-white/50 w-12 text-right">{Math.round(imgState.scale * 100)}%</span>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="w-80 bg-[#1e1e1e] border-l border-white/10 p-6 flex flex-col gap-6 overflow-y-auto">
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Import Image</h2>
            <p className="text-sm text-white/50">Set target size and position image.</p>
          </div>

          {/* Size Inputs */}
          <div className="space-y-4">
            <Label>Target Size</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px]">Width</Label>
                <Input
                  type="number"
                  value={targetSize.width}
                  onChange={(e) => setTargetSize(s => ({ ...s, width: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px]">Height</Label>
                <Input
                  type="number"
                  value={targetSize.height}
                  onChange={(e) => setTargetSize(s => ({ ...s, height: Number(e.target.value) }))}
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
