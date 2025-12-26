import { Trash, AlertCircle, Info } from 'lucide-react'
import { useMemo, useRef } from 'react'
import {
  useSceneStore,
  type SceneNode,
  type RectNode,
  type TextNode,
  type BitmapNode,
  type TimeNode,
  type GPathNode,
  timeFormatOptions,
  SYSTEM_FONTS,
  dateParts,
  timeParts,
} from '../store/scene'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Switch } from './ui/switch'
import { ColorSelect } from './ColorSelect'

type SceneNodeKey = keyof (RectNode & TextNode & BitmapNode & TimeNode & GPathNode)
type TimeKeys = keyof TimeNode
type FontFilter = 'digits' | 'standard' | 'extended' | 'none'

const FONT_FILTERS: { id: FontFilter; label: string }[] = [
  { id: 'digits', label: 'Digits only (0-9)' },
  { id: 'standard', label: 'Digits & Case (Standard)' },
  { id: 'extended', label: 'Extended (with punctuation)' },
  { id: 'none', label: 'None (All characters)' },
]

const TIME_FORMAT_HELP = [
  { token: 'HH', desc: '00-23' },
  { token: 'hh', desc: '01-12' },
  { token: 'MM', desc: '00-59' },
  { token: 'SS', desc: '00-59' },
  { token: 'APM', desc: 'AM/PM' },
]

const DATE_FORMAT_HELP = [
  { token: 'yyyy', desc: '2024' },
  { token: 'yy', desc: '24' },
  { token: 'MMM', desc: 'JAN' },
  { token: 'mmm', desc: 'Jan' },
  { token: 'MM', desc: '01' },
  { token: 'M', desc: '1' },
  { token: 'dd', desc: '01' },
  { token: 'd', desc: '1' },
  { token: 'EEE', desc: 'Mon' },
]

export const PropertiesPanel = () => {
  const {
    nodes,
    selectedIds,
    updateNode,
    removeNode,
    customFonts,
    addCustomFont,
    backgroundColor,
    setBackgroundColor,
    targetPlatforms,
    setTargetPlatforms,
    stage,
    aplitePreview,
    toggleAplite,
  } = useSceneStore()
  const target = useMemo(() => nodes.find((n) => n.id === selectedIds[0]), [nodes, selectedIds])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Determine primary group based on stage dimensions
  const isBasalt = stage.width === 144
  const isEmery = stage.width === 200
  const isChalk = stage.width === 180

  const handleTogglePlatform = (platform: string, enabled: boolean) => {
    if (enabled) {
      setTargetPlatforms([...targetPlatforms, platform])
    } else {
      setTargetPlatforms(targetPlatforms.filter((p) => p !== platform))
    }
  }

  const handleToggleBasaltGroup = (enabled: boolean) => {
    const basaltPlatforms = ['aplite', 'basalt', 'diorite', 'flint']
    if (enabled) {
      setTargetPlatforms([...new Set([...targetPlatforms, ...basaltPlatforms])])
    } else {
      setTargetPlatforms(targetPlatforms.filter((p) => !basaltPlatforms.includes(p)))
    }
  }

  // Dynamic background based on element color, but kept light
  const bgTint =
    target && 'fill' in target
      ? (target as RectNode | TextNode | TimeNode).fill
      : backgroundColor || '#f0f0f0'

  const bgStyle = target ? { background: `linear-gradient(135deg, ${bgTint}11, #ffffff)` } : { background: '#ffffff' }

  const update = (key: SceneNodeKey, value: unknown) => {
    if (!target) return
    updateNode(target.id, { [key]: value } as Partial<SceneNode>)
  }
  const updateTime = (key: TimeKeys, value: TimeNode[TimeKeys]) => {
    if (!target || target.type !== 'time') return
    updateNode(target.id, { [key]: value } as Partial<SceneNode>)
  }

  // Helper to find the current font object based on node properties
  const getCurrentFontKey = (node: TextNode | TimeNode) => {
    if (node.customFontId) return `custom-${node.customFontId}`
    const found = SYSTEM_FONTS.find(
      (f) =>
        f.family === node.fontFamily &&
        f.size === node.fontSize &&
        (node.bold === undefined ? !f.label.includes('Bold') : f.label.includes('Bold') === node.bold),
    )
    return found ? found.key : SYSTEM_FONTS[0].key
  }

  const handleFontChange = (key: string, isTime: boolean = false) => {
    if (key === 'upload-new') {
      fileInputRef.current?.click()
      return
    }

    if (key.startsWith('custom-')) {
      const id = key.replace('custom-', '')
      const font = customFonts.find((f) => f.id === id)
      if (font) {
        if (isTime) {
          updateTime('fontFamily', font.name)
          updateTime('customFontId', id)
          updateTime('fontSize', 24)
          updateTime('fontFilter', 'extended' as any)
        } else {
          updateNode(target!.id, {
            fontFamily: font.name,
            customFontId: id,
            fontSize: 24,
            fontFilter: 'extended',
          } as any)
        }
      }
      return
    }

    const font = SYSTEM_FONTS.find((f) => f.key === key)
    if (!font) return
    const isBold = font.label.includes('Bold')

    if (isTime) {
      updateTime('fontFamily', font.family)
      updateTime('fontSize', font.size)
      updateTime('bold', isBold)
      updateTime('customFontId', undefined)
    } else {
      update('fontFamily', font.family)
      update('fontSize', font.size)
      update('bold', isBold)
      update('customFontId', undefined)
    }
  }

  const handleCustomUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const id = await addCustomFont(file)

    // Access fresh state to get the new font object
    const freshFonts = useSceneStore.getState().customFonts
    const font = freshFonts.find((f) => f.id === id)

    if (font && target) {
      if (target.type === 'text' || target.type === 'time') {
        updateNode(target.id, {
          fontFamily: font.name,
          customFontId: id,
          fontSize: 24,
          fontFilter: 'extended',
        } as any)
      }
    }
    e.target.value = ''
  }

  const fontWarning = useMemo(() => {
    if (!target || (target.type !== 'text' && target.type !== 'time')) return null
    const fontKey = getCurrentFontKey(target as TextNode | TimeNode)
    const font = SYSTEM_FONTS.find((f) => f.key === fontKey)
    if (!font || !font.regex) return null

    let text = ''
    if (target.type === 'text') {
      text = (target as TextNode).text
    } else {
      const tNode = target as TimeNode
      if (tNode.format === 'custom') {
        if (tNode.text === 'time') {
          text = timeParts(new Date(), tNode.customFormat || '')
        } else {
          text = dateParts(new Date(), tNode.customFormat || '')
        }
      } else {
        const opt = timeFormatOptions[tNode.text].find((o) => o.id === tNode.format)
        text = opt ? opt.formatter(new Date()) : ''
      }
    }

    if (!new RegExp(font.regex).test(text)) {
      return 'Missing glyphs'
    }
    return null
  }, [target])

  if (!target) {
    return (
      <div className="space-y-6 border border-black p-4 bg-white" style={bgStyle}>
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-sm font-semibold text-black">Background Color</div>
            </div>
          </div>
          <ColorSelect label="Background" value={backgroundColor} onChange={setBackgroundColor} />
        </div>

        <div className="pt-4 border-t border-black/10 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-sm font-semibold text-black">Monochrome Preview</div>
            </div>
          </div>
          <div className="grid grid-cols-[90px_1fr] items-center gap-3">
            <div className="text-[11px] text-[#666] uppercase">Preview</div>
            <div className="flex items-center justify-center h-9">
              <Switch checked={aplitePreview} onClick={toggleAplite} className="scale-110" />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-black/10 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-sm font-semibold text-black">Compatibility</div>
              <div className="text-xs uppercase text-black/50">PLATFORMS</div>
            </div>
          </div>

          <div className="space-y-3 px-1">
            {isChalk && (
              <p className="text-[10px] text-black/40 italic leading-snug">
                Round (Chalk) projects are restricted to their own platform due to layout differences.
              </p>
            )}

            {isBasalt && (
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="compat-emery"
                  checked={targetPlatforms.includes('emery')}
                  onChange={(e) => handleTogglePlatform('emery', e.target.checked)}
                  className="mt-0.5 w-3.5 h-3.5 rounded-none border-black accent-black"
                />
                <label htmlFor="compat-emery" className="text-[11px] text-black/70 cursor-pointer select-none leading-tight">
                  Compatible with <strong className="text-black">Emery (Pebble Time 2)</strong>?
                  <span className="block text-[9px] text-black/40 mt-0.5">
                    Canvas remains 144x168. Emery will center or upscale.
                  </span>
                </label>
              </div>
            )}

            {isEmery && (
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="compat-basalt"
                  checked={targetPlatforms.includes('basalt')}
                  onChange={(e) => handleToggleBasaltGroup(e.target.checked)}
                  className="mt-0.5 w-3.5 h-3.5 rounded-none border-black accent-black"
                />
                <label htmlFor="compat-basalt" className="text-[11px] text-black/70 cursor-pointer select-none leading-tight">
                  Compatible with <strong className="text-black">Standard Rect (144x168)</strong>?
                  <span className="block text-[9px] text-black/40 mt-0.5">
                    Warning: Design might be cropped on smaller screens.
                  </span>
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 text-[10px] text-black/40 italic leading-snug border-t border-black/5">
          Tip: Select a layer on the canvas to edit its individual properties.
        </div>
      </div>
    )
  }

  const isGPath = target.type === 'gpath'

  return (
    <div className="space-y-3 border border-black p-4 bg-white" style={bgStyle}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-black">{target.name}</div>
          <div className="text-xs uppercase text-black/50">{target.type}</div>
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
          disabled={isGPath}
          title={isGPath ? 'Resize GPath via canvas handles' : undefined}
          onChange={(e) => update('width', Math.max(4, parseFloat(e.target.value) || 0))}
        />
      </GridPair>
      <GridPair label="Height">
        <Input
          type="number"
          value={Math.round(target.height)}
          min={4}
          disabled={isGPath}
          title={isGPath ? 'Resize GPath via canvas handles' : undefined}
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
          value={Math.round(target.strokeWidth)}
          min={0}
          step={1}
          onChange={(e) => update('strokeWidth', Math.max(0, Math.round(parseFloat(e.target.value) || 0)))}
        />
      </GridPair>
      {target.type === 'text' && (
        <>
          <GridPair label="Text">
            <Input value={target.text} onChange={(e) => update('text', e.target.value)} />
          </GridPair>
          <GridPair label="Font">
            <select
              className="h-9 w-full border border-black bg-white px-3 text-sm text-black rounded-none focus:outline-none"
              value={getCurrentFontKey(target)}
              onChange={(e) => handleFontChange(e.target.value, false)}
            >
              <optgroup label="System Fonts">
                {SYSTEM_FONTS.map((font) => (
                  <option key={font.key} value={font.key}>
                    {font.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Custom Fonts">
                 {customFonts.map(font => (
                   <option key={font.id} value={`custom-${font.id}`}>{font.name}</option>
                 ))}
                 <option value="upload-new">+ Upload New...</option>
              </optgroup>
            </select>
            {fontWarning && (
              <div className="mt-1 flex items-center gap-1.5 text-[10px] text-red-500 font-medium leading-tight">
                <AlertCircle size={10} className="shrink-0" />
                {fontWarning}
              </div>
            )}
          </GridPair>
          {target.customFontId && (
            <>
              <GridPair label="Size (px)">
                <Input
                  type="number"
                  min={10}
                  max={48}
                  value={target.fontSize}
                  onChange={(e) => update('fontSize', Math.min(48, Math.max(10, parseFloat(e.target.value) || 24)))}
                />
              </GridPair>
              <GridPair label="Filter">
                <select
                  className="h-9 w-full border border-black bg-white px-3 text-sm text-black rounded-none focus:outline-none"
                  value={target.fontFilter || 'standard'}
                  onChange={(e) => update('fontFilter', e.target.value)}
                >
                  {FONT_FILTERS.map(f => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
              </GridPair>
            </>
          )}
        </>
      )}
      {target.type === 'time' && (
        <>
          <GridPair label="Type">
            <select
              className="h-9 w-full border border-black bg-white px-3 text-sm text-black rounded-none focus:outline-none"
              value={target.text}
              onChange={(e) => {
                const newType = e.target.value as TimeNode['text']
                updateNode(target.id, {
                  text: newType,
                  format: timeFormatOptions[newType][0].id,
                } as any)
              }}
            >
              <option value="time">Time</option>
              <option value="date">Date</option>
            </select>
          </GridPair>
          <GridPair label="Format">
            <select
              className="h-9 w-full border border-black bg-white px-3 text-sm text-black rounded-none focus:outline-none"
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
          {target.format === 'custom' && (
            <GridPair
              label="Pattern"
              helpContent={
                <div className="text-[10px] leading-relaxed font-mono">
                  <div className="font-bold border-b border-black/10 mb-1.5 pb-1 font-sans text-black">
                    Supported Tokens
                  </div>
                  {(target.text === 'time' ? TIME_FORMAT_HELP : DATE_FORMAT_HELP).map((h) => (
                    <div key={h.token} className="grid grid-cols-[36px_1fr] gap-1">
                      <span className="font-bold text-black">{h.token}</span>
                      <span className="text-black/60">{h.desc}</span>
                    </div>
                  ))}
                </div>
              }
            >
              <Input
                value={target.customFormat || ''}
                placeholder={target.text === 'time' ? 'HH:MM' : 'yyyy-MM-dd'}
                onChange={(e) => updateTime('customFormat', e.target.value)}
              />
            </GridPair>
          )}
          <GridPair label="Font">
            <select
              className="h-9 w-full border border-black bg-white px-3 text-sm text-black rounded-none focus:outline-none"
              value={getCurrentFontKey(target)}
              onChange={(e) => handleFontChange(e.target.value, true)}
            >
               <optgroup label="System Fonts">
                {SYSTEM_FONTS.map((font) => (
                  <option key={font.key} value={font.key}>
                    {font.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Custom Fonts">
                 {customFonts.map(font => (
                   <option key={font.id} value={`custom-${font.id}`}>{font.name}</option>
                 ))}
                 <option value="upload-new">+ Upload New...</option>
              </optgroup>
            </select>
            {fontWarning && (
              <div className="mt-1 flex items-center gap-1.5 text-[10px] text-red-500 font-medium leading-tight">
                <AlertCircle size={10} className="shrink-0" />
                {fontWarning}
              </div>
            )}
          </GridPair>
          {target.customFontId && (
            <>
              <GridPair label="Size (px)">
                <Input
                  type="number"
                  min={10}
                  max={48}
                  value={target.fontSize}
                  onChange={(e) => updateTime('fontSize', Math.min(48, Math.max(10, parseFloat(e.target.value) || 24)))}
                />
              </GridPair>
              <GridPair label="Filter">
                <select
                  className="h-9 w-full border border-black bg-white px-3 text-sm text-black rounded-none focus:outline-none"
                  value={target.fontFilter || 'standard'}
                  onChange={(e) => updateTime('fontFilter', e.target.value as any)}
                >
                  {FONT_FILTERS.map(f => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
              </GridPair>
            </>
          )}
        </>
      )}
      {target.type === 'bitmap' && (
        <GridPair label="File">
          <div className="text-sm text-black/80 truncate">{target.fileName}</div>
        </GridPair>
      )}
      {target.type === 'gpath' && (
        <GridPair label="Points">
          <div className="text-sm text-black/80">{target.points.length}</div>
        </GridPair>
      )}
      <input
        type="file"
        accept=".ttf,.otf,.woff"
        ref={fileInputRef}
        className="hidden"
        onChange={handleCustomUpload}
      />
    </div>
  )
}


const GridPair = ({
  label,
  helpContent,
  children,
}: {
  label: string
  helpContent?: React.ReactNode
  children: React.ReactNode
}) => (
  <div className="grid grid-cols-[90px_1fr] items-center gap-3">
    <div className="flex items-center gap-1.5">
      <Label className="text-[11px] text-[#666]">{label}</Label>
      {helpContent && (
        <div className="group relative flex items-center">
          <Info size={10} className="text-black/40 cursor-help hover:text-black/70" />
          <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-48 bg-white border border-black p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] z-50 pointer-events-none">
            {helpContent}
          </div>
        </div>
      )}
    </div>
    {children}
  </div>
)
