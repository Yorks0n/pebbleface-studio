import { useRef, useState } from 'react'
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  Clock3,
  Crosshair,
  Images,
  Image as ImageIcon,
  PenTool,
  Square,
  Type,
} from 'lucide-react'
import { useSceneStore } from '../store/scene'
import { Button } from './ui/button'
import { ImageImportDialog } from './ImageImportDialog'

type CenterAxis = 'horizontal' | 'vertical' | 'both'

export const Toolbar = () => {
  const {
    addRect,
    addText,
    addTimeText,
    addImageTime,
    nodes,
    selectedIds,
    stage,
    setTool,
    tool,
    setSelection,
    updateNode,
  } = useSceneStore()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const addBitmap = useSceneStore((s) => s.addBitmap)

  const [importFile, setImportFile] = useState<File | null>(null)

  const handleFileSelect = (file: File) => {
    setImportFile(file)
  }

  const handleImportConfirm = (dataUrl: string, width: number, height: number) => {
    if (!importFile) return
    const name = importFile.name.replace(/\.[^/.]+$/, '')
    addBitmap({
      dataUrl,
      file: null, // We used the cropped version, original file object might not match dataUrl content anymore if we wanted to use it for raw resource, but for now dataUrl is source of truth
      fileName: `${name}.png`,
      width,
      height,
      x: 20,
      y: 20,
      name,
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
  const addImageTimeCentered = () => addImageTime(centerPoint.x - 58, centerPoint.y - 16)
  const enableGPathTool = () => {
    setSelection([])
    setTool(tool === 'gpath' ? 'select' : 'gpath')
  }

  const selectedNodes = nodes.filter((node) => selectedIds.includes(node.id))
  const hasSelection = selectedNodes.length > 0

  const centerSelection = (axis: CenterAxis) => {
    if (!hasSelection) return

    const minX = Math.min(...selectedNodes.map((node) => node.x))
    const minY = Math.min(...selectedNodes.map((node) => node.y))
    const maxX = Math.max(...selectedNodes.map((node) => node.x + node.width))
    const maxY = Math.max(...selectedNodes.map((node) => node.y + node.height))
    const dx = axis === 'vertical' ? 0 : Math.round((stage.width - (maxX - minX)) / 2 - minX)
    const dy = axis === 'horizontal' ? 0 : Math.round((stage.height - (maxY - minY)) / 2 - minY)

    selectedNodes.forEach((node) => {
      updateNode(node.id, {
        x: node.x + dx,
        y: node.y + dy,
      })
    })
  }

  return (
    <div className="studio-toolbar">
      <div className="studio-toolbar-row">
        <span className="toolbar-caption">Insert</span>
        <Button variant="ghost" onClick={addRectCentered} size="sm" className="toolbar-button">
          <Square size={16} />
          Rectangle
        </Button>
        <Button variant="ghost" onClick={addTextCentered} size="sm" className="toolbar-button">
          <Type size={16} />
          Text
        </Button>
        <Button variant="ghost" onClick={addTimeCentered} size="sm" className="toolbar-button">
          <Clock3 size={16} />
          Time / Date
        </Button>
        <Button variant="ghost" onClick={addImageTimeCentered} size="sm" className="toolbar-button">
          <Images size={16} />
          PNG Glyph Time
        </Button>
        <Button variant="ghost" onClick={triggerFile} size="sm" className="toolbar-button">
          <ImageIcon size={16} />
          Image
        </Button>
        <Button
          variant={tool === 'gpath' ? 'default' : 'ghost'}
          onClick={enableGPathTool}
          size="sm"
          className="toolbar-button"
          data-state={tool === 'gpath' ? 'active' : undefined}
          aria-pressed={tool === 'gpath'}
        >
          <PenTool size={16} />
          GPath
        </Button>
      </div>
      <div className="studio-toolbar-row studio-toolbar-row-secondary">
        <span className="toolbar-caption">Arrange</span>
        <Button
          variant="ghost"
          onClick={() => centerSelection('horizontal')}
          size="sm"
          className="toolbar-button"
          disabled={!hasSelection}
          title="Center selected layers horizontally on the canvas"
        >
          <AlignCenterVertical size={16} />
          Horizontal
        </Button>
        <Button
          variant="ghost"
          onClick={() => centerSelection('vertical')}
          size="sm"
          className="toolbar-button"
          disabled={!hasSelection}
          title="Center selected layers vertically on the canvas"
        >
          <AlignCenterHorizontal size={16} />
          Vertical
        </Button>
        <Button
          variant="ghost"
          onClick={() => centerSelection('both')}
          size="sm"
          className="toolbar-button"
          disabled={!hasSelection}
          title="Center selected layers both horizontally and vertically"
        >
          <Crosshair size={16} />
          Both
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
        key={importFile ? `${importFile.name}-${importFile.lastModified}` : 'closed'}
        isOpen={!!importFile} 
        file={importFile} 
        onClose={() => setImportFile(null)} 
        onConfirm={handleImportConfirm}
      />
    </div>
  )
}
