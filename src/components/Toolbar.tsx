import { useRef } from 'react'
import { Clock3, Image as ImageIcon, Pointer, Square, Type } from 'lucide-react'
import { useSceneStore, type Tool } from '../store/scene'
import { Button } from './ui/button'

export const Toolbar = () => {
  const { tool, setTool, addRect, addText, addTimeText, stage } = useSceneStore()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const addBitmap = useSceneStore((s) => s.addBitmap)

  const handleTool = (next: Tool) => () => setTool(next)

  const handleAddImage = async (file: File) => {
    const dataUrl = await readFileAsDataURL(file)
    const size = await getImageSize(dataUrl)
    addBitmap({
      dataUrl,
      file,
      fileName: file.name,
      width: Math.min(180, size.width),
      height: Math.min(180, size.height),
      x: 20,
      y: 20,
      name: file.name.replace(/\.[^/.]+$/, ''),
      rotation: 0,
      stroke: '#000000',
      strokeWidth: 0,
    })
  }

  const triggerFile = () => {
    setTool('image')
    fileInputRef.current?.click()
  }

  const centerPoint = { x: stage.width / 2, y: stage.height / 2 }
  const addRectCentered = () => addRect(centerPoint.x - 32, centerPoint.y - 24)
  const addTextCentered = () => addText(centerPoint.x - 48, centerPoint.y - 10)
  const addTimeCentered = () => addTimeText(centerPoint.x - 48, centerPoint.y + 16)

  return (
    <div className="glass-panel rounded-2xl p-3 flex flex-col gap-3">
      <div className="text-sm font-semibold tracking-wide text-white flex items-center gap-2">
        Pebble Studio
        <span className="ml-auto text-[10px] uppercase text-white/60">Tools</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={tool === 'select' ? 'default' : 'subtle'}
          onClick={handleTool('select')}
          size="lg"
          className="justify-start"
        >
          <Pointer size={16} />
          Select
        </Button>
        <Button
          variant="subtle"
          onClick={addRectCentered}
          size="lg"
          className="justify-start"
        >
          <Square size={16} />
          Rectangle
        </Button>
        <Button
          variant="subtle"
          onClick={addTextCentered}
          size="lg"
          className="justify-start"
        >
          <Type size={16} />
          Text
        </Button>
        <Button
          variant="subtle"
          onClick={addTimeCentered}
          size="lg"
          className="justify-start"
        >
          <Clock3 size={16} />
          Time / Date
        </Button>
        <Button
          variant={tool === 'image' ? 'default' : 'subtle'}
          onClick={triggerFile}
          size="lg"
          className="justify-start"
        >
          <ImageIcon size={16} />
          Bitmap
        </Button>
      </div>
      <div className="rounded-xl border border-white/5 p-3 bg-black/20 text-xs text-white/70 leading-relaxed">
        - Quick-add elements with the buttons<br />- Click canvas to place Rect / Text / Time<br />- Hold Shift for
        multi-select, then transform<br />- Drag to position
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (!file) return
          handleAddImage(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}

const readFileAsDataURL = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

const getImageSize = (src: string) =>
  new Promise<{ width: number; height: number }>((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.width, height: img.height })
    img.src = src
  })
