import { Trash } from 'lucide-react'
import { useMemo } from 'react'
import {
  useSceneStore,
  type SceneNode,
  type RectNode,
  type TextNode,
  type BitmapNode,
  type TimeNode,
  timeFormatOptions,
  allowedFonts,
} from '../store/scene'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { ColorSelect } from './ColorSelect'

type SceneNodeKey = keyof (RectNode & TextNode & BitmapNode & TimeNode)
type TimeKeys = keyof TimeNode

export const PropertiesPanel = () => {
  const { nodes, selectedIds, updateNode, removeNode } = useSceneStore()
  const target = useMemo(() => nodes.find((n) => n.id === selectedIds[0]), [nodes, selectedIds])
  const bgTint =
    target && 'fill' in target
      ? (target as RectNode | TextNode | TimeNode).fill
      : '#0b0d12'
  const bgStyle = target
    ? { background: `linear-gradient(135deg, ${bgTint}22, rgba(0,0,0,0.6))` }
    : { background: 'rgba(255,255,255,0.04)' }

  const update = (key: SceneNodeKey, value: unknown) => {
    if (!target) return
    updateNode(target.id, { [key]: value } as Partial<SceneNode>)
  }
  const updateTime = (key: TimeKeys, value: TimeNode[TimeKeys]) => {
    if (!target || target.type !== 'time') return
    updateNode(target.id, { [key]: value } as Partial<SceneNode>)
  }

  if (!target) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
        Select an element to edit its properties.
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 p-4" style={bgStyle}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">{target.name}</div>
          <div className="text-xs uppercase text-white/50">{target.type}</div>
        </div>
        <Button size="icon" variant="ghost" onClick={() => removeNode(target.id)} title="Remove">
          <Trash size={16} />
        </Button>
      </div>
      <GridPair label="X">
        <Input
          type="number"
          value={Math.round(target.x)}
          onChange={(e) => update('x', parseFloat(e.target.value) || 0)}
        />
      </GridPair>
      <GridPair label="Y">
        <Input
          type="number"
          value={Math.round(target.y)}
          onChange={(e) => update('y', parseFloat(e.target.value) || 0)}
        />
      </GridPair>
      <GridPair label="Width">
        <Input
          type="number"
          value={Math.round(target.width)}
          min={4}
          onChange={(e) => update('width', Math.max(4, parseFloat(e.target.value) || 0))}
        />
      </GridPair>
      <GridPair label="Height">
        <Input
          type="number"
          value={Math.round(target.height)}
          min={4}
          onChange={(e) => update('height', Math.max(4, parseFloat(e.target.value) || 0))}
        />
      </GridPair>
      <GridPair label="Rotation">
        <Input
          type="number"
          value={Math.round(target.rotation)}
          onChange={(e) => update('rotation', parseFloat(e.target.value) || 0)}
        />
      </GridPair>
      {'fill' in target && <ColorSelect label="Fill" value={target.fill} onChange={(c) => update('fill', c)} />}
      <ColorSelect label="Stroke" value={target.stroke} onChange={(c) => update('stroke', c)} />
      <GridPair label="Stroke px">
        <Input
          type="number"
          value={target.strokeWidth}
          min={0}
          step={0.5}
          onChange={(e) => update('strokeWidth', Math.max(0, parseFloat(e.target.value) || 0))}
        />
      </GridPair>
      {target.type === 'text' && (
        <>
          <GridPair label="Text">
            <Input value={target.text} onChange={(e) => update('text', e.target.value)} />
          </GridPair>
          <GridPair label="Font">
            <select
              className="h-9 w-full rounded-md border border-white/10 bg-black/40 px-3 text-sm text-white/80"
              value={target.fontFamily}
              onChange={(e) => update('fontFamily', e.target.value)}
            >
              {allowedFonts.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
          </GridPair>
          <GridPair label="Font size">
            <Input
              type="number"
              value={target.fontSize}
              onChange={(e) => update('fontSize', parseFloat(e.target.value) || 0)}
            />
          </GridPair>
        </>
      )}
      {target.type === 'time' && (
        <>
          <GridPair label="Type">
            <select
              className="h-9 w-full rounded-md border border-white/10 bg-black/40 px-3 text-sm text-white/80"
              value={target.text}
              onChange={(e) => updateTime('text', e.target.value as TimeNode['text'])}
            >
              <option value="time">Time</option>
              <option value="date">Date</option>
            </select>
          </GridPair>
          <GridPair label="Format">
            <select
              className="h-9 w-full rounded-md border border-white/10 bg-black/40 px-3 text-sm text-white/80"
              value={target.format}
              onChange={(e) => updateTime('format', e.target.value as TimeNode['format'])}
            >
              {timeFormatOptions[target.text].map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </GridPair>
          <GridPair label="Font">
            <select
              className="h-9 w-full rounded-md border border-white/10 bg-black/40 px-3 text-sm text-white/80"
              value={target.fontFamily}
              onChange={(e) => updateTime('fontFamily', e.target.value)}
            >
              {allowedFonts.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
          </GridPair>
          <GridPair label="Font size">
            <Input
              type="number"
              value={target.fontSize}
              onChange={(e) => updateTime('fontSize', parseFloat(e.target.value) || 0)}
            />
          </GridPair>
        </>
      )}
      {target.type === 'bitmap' && (
        <GridPair label="File">
          <div className="text-sm text-white/80 truncate">{target.fileName}</div>
        </GridPair>
      )}
    </div>
  )
}

const GridPair = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="grid grid-cols-[90px_1fr] items-center gap-3">
    <Label className="text-[11px]">{label}</Label>
    {children}
  </div>
)
