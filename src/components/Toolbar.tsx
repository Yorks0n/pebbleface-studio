import { useRef, useState } from 'react'
import { Clock3, Image as ImageIcon, PenTool, Square, Type } from 'lucide-react'
import { useSceneStore } from '../store/scene'
import { Button } from './ui/button'
import { ImageImportDialog } from './ImageImportDialog'

export const Toolbar = () => {
  const { addRect, addText, addTimeText, stage, setTool, tool, setSelection } = useSceneStore()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const addBitmap = useSceneStore((s) => s.addBitmap)

  const [importFile, setImportFile] = useState<File | null>(null)

  const handleFileSelect = (file: File) => {
    setImportFile(file)
  }

  const handleImportConfirm = (dataUrl: string, width: number, height: number) => {
    if (!importFile) return
    addBitmap({
      dataUrl,
      file: null, // We used the cropped version, original file object might not match dataUrl content anymore if we wanted to use it for raw resource, but for now dataUrl is source of truth
      fileName: importFile.name,
      width,
      height,
      x: 20,
      y: 20,
      name: importFile.name.replace(/\.[^/.]+$/, ''),
      rotation: 0,
      stroke: '#000000',
      strokeWidth: 0,
    })
    setImportFile(null)
  }

  const triggerFile = () => fileInputRef.current?.click()

  const centerPoint = { x: stage.width / 2, y: stage.height / 2 }
  const addRectCentered = () => addRect(centerPoint.x - 32, centerPoint.y - 24)
  const addTextCentered = () => addText(centerPoint.x - 48, centerPoint.y - 10)
  const addTimeCentered = () => addTimeText(centerPoint.x - 48, centerPoint.y + 16)
  const enableGPathTool = () => {
    setSelection([])
    setTool(tool === 'gpath' ? 'select' : 'gpath')
  }

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm font-semibold tracking-wide text-white">
        Tools
        <span className="text-[11px] uppercase text-white/60">Quick Add</span>
      </div>
      <div className="glass-panel rounded-2xl p-3 flex flex-wrap items-center gap-2">
        <Button variant="subtle" onClick={addRectCentered} size="lg" className="justify-start">
          <Square size={16} />
          Rectangle
        </Button>
        <Button variant="subtle" onClick={addTextCentered} size="lg" className="justify-start">
          <Type size={16} />
          Text
        </Button>
        <Button variant="subtle" onClick={addTimeCentered} size="lg" className="justify-start">
          <Clock3 size={16} />
          Time / Date
        </Button>
        <Button variant="subtle" onClick={triggerFile} size="lg" className="justify-start">
          <ImageIcon size={16} />
          Bitmap
        </Button>
        <Button
          variant="subtle"
          onClick={enableGPathTool}
          size="lg"
          className="justify-start"
          data-state={tool === 'gpath' ? 'active' : undefined}
          aria-pressed={tool === 'gpath'}
        >
          <PenTool size={16} />
          GPath
        </Button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (!file) return
          handleFileSelect(file)
          e.target.value = ''
        }}
      />
      
      <ImageImportDialog 
        isOpen={!!importFile} 
        file={importFile} 
        onClose={() => setImportFile(null)} 
        onConfirm={handleImportConfirm}
      />
    </div>
  )
}


