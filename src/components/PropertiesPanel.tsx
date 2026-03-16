import { Trash, AlertCircle, Info } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  useSceneStore,
  type SceneNode,
  type RectNode,
  type TextNode,
  type BitmapNode,
  type TimeNode,
  type ImageTimeNode,
  type ImageTimeMode,
  type ImageTimeTimeFormat,
  type ImageTimeDateFormat,
  type ImageTimeWeekFormat,
  TIME_DIGITS,
  MONTH_WORDS,
  WEEK_LETTERS,
  WEEK_WORDS,
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

type SceneNodeKey = keyof (RectNode & TextNode & BitmapNode & TimeNode & ImageTimeNode & GPathNode)
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
  { token: 'E', desc: '1-7' },
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
  const digitInputRef = useRef<HTMLInputElement>(null)

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
  const updateImageTime = (data: Partial<ImageTimeNode>) => {
    if (!target || target.type !== 'image-time') return
    updateNode(target.id, data as Partial<SceneNode>)
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

  const handleDigitUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!target || target.type !== 'image-time') return
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const glyphAssets = (
      await Promise.all(
        files.map(async (file) => {
          if (file.type !== 'image/png') return null
          const key = parseGlyphKeyFromFileName(file.name)
          if (!key) return null
          const dataUrl = await readFileAsDataUrl(file)
          return {
            key,
            dataUrl,
            fileName: file.name,
            file,
          }
        }),
      )
    ).filter(Boolean) as ImageTimeNode['glyphs']

    if (glyphAssets.length > 0) {
      const merged = [...target.glyphs]
      glyphAssets.forEach((asset) => {
        const index = merged.findIndex((item) => item.key === asset.key)
        if (index >= 0) merged[index] = asset
        else merged.push(asset)
      })
      merged.sort((a, b) => a.key.localeCompare(b.key))
      updateImageTime({ glyphs: merged })
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
  const isImageTime = target.type === 'image-time'

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
      {!isImageTime && (
        <GridPair label="Rotation">
          <Input
            type="number"
            value={Math.round(target.rotation)}
            onChange={(e) => update('rotation', parseFloat(e.target.value) || 0)}
          />
        </GridPair>
      )}
      {'fill' in target && <ColorSelect label="Fill" value={target.fill} onChange={(c) => update('fill', c)} />}
      {!isImageTime && <ColorSelect label="Stroke" value={target.stroke} onChange={(c) => update('stroke', c)} />}
      {!isImageTime && (
        <GridPair label="Stroke px">
          <Input
            type="number"
            value={Math.round(target.strokeWidth)}
            min={0}
            step={1}
            onChange={(e) => update('strokeWidth', Math.max(0, Math.round(parseFloat(e.target.value) || 0)))}
          />
        </GridPair>
      )}
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
                  {target.text === 'date' && (
                    <div className="mt-2 border-t border-black/10 pt-1.5 font-sans text-black/60">
                      1-7 represents Mon to Sun
                    </div>
                  )}
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
      {target.type === 'image-time' && (
        <>
          <GridPair label="Mode">
            <select
              className="h-9 w-full border border-black bg-white px-3 text-sm text-black rounded-none focus:outline-none"
              value={target.mode}
              onChange={(e) => updateImageTime({ mode: e.target.value as ImageTimeMode })}
            >
              <option value="time">Time</option>
              <option value="date">Date</option>
              <option value="week">Week</option>
            </select>
          </GridPair>
          <GridPair label="Format">
            {target.mode === 'time' && (
              <select
                className="h-9 w-full border border-black bg-white px-3 text-sm text-black rounded-none focus:outline-none"
                value={target.timeFormat}
                onChange={(e) => updateImageTime({ timeFormat: e.target.value as ImageTimeTimeFormat })}
              >
                <option value="24h">24h</option>
                <option value="12h">12h</option>
              </select>
            )}
            {target.mode === 'date' && (
              <select
                className="h-9 w-full border border-black bg-white px-3 text-sm text-black rounded-none focus:outline-none"
                value={target.dateFormat}
                onChange={(e) => updateImageTime({ dateFormat: e.target.value as ImageTimeDateFormat })}
              >
                <option value="MM">MM</option>
                <option value="DD">DD</option>
                <option value="MMM">MMM</option>
              </select>
            )}
            {target.mode === 'week' && (
              <select
                className="h-9 w-full border border-black bg-white px-3 text-sm text-black rounded-none focus:outline-none"
                value={target.weekFormat}
                onChange={(e) => updateImageTime({ weekFormat: e.target.value as ImageTimeWeekFormat })}
              >
                <option value="letters">Letters (MON to M,O,N)</option>
                <option value="words">Words (MON..SUN)</option>
              </select>
            )}
          </GridPair>
          <GridPair label="PNGs" helpContent={imageTimeUploadHelp(target)}>
            <Button
              variant="outline"
              className="w-full min-w-0 justify-start px-3 text-left whitespace-normal break-words h-auto py-2"
              onClick={() => digitInputRef.current?.click()}
            >
              Upload PNGs
            </Button>
          </GridPair>
          <GridPair label="Status">
            <div className="min-w-0 break-words text-sm leading-snug text-black/80">
              {target.glyphs.length} loaded
              {requiredGlyphKeys(target).length > 0
                ? ` · Missing ${requiredGlyphKeys(target).filter((key) => !target.glyphs.some((item) => item.key === key)).join(', ')}`
                : ''}
            </div>
          </GridPair>
          {usesSegmentedGlyphs(target) ? (
            <GridPair label="Digit W">
              <Input
                type="number"
                min={4}
                value={Math.round(imageTimeDigitWidth(target))}
                onChange={(e) => {
                  const digitWidth = Math.max(4, parseFloat(e.target.value) || 0)
                  updateImageTime({
                    width: digitWidth * segmentedCharCount(target) + totalSegmentGap(target),
                  })
                }}
              />
            </GridPair>
          ) : null}
          <GridPair label="Digit H">
            <Input
              type="number"
              min={4}
              value={Math.round(target.height)}
              onChange={(e) => updateImageTime({ height: Math.max(4, parseFloat(e.target.value) || 0) })}
            />
          </GridPair>
          {usesSegmentedGlyphs(target) ? (
            <>
              <GridPair label="Char Gap">
                <Input
                  type="number"
                  min={0}
                  value={Math.round(target.charSpacing)}
                  onChange={(e) => {
                    const charSpacing = Math.max(0, parseFloat(e.target.value) || 0)
                    updateImageTime({
                      charSpacing,
                      width: imageTimeDigitWidth(target) * segmentedCharCount(target) + totalSegmentGap({ ...target, charSpacing }),
                    })
                  }}
                />
              </GridPair>
              {segmentedCharCount(target) === 4 ? (
                <GridPair label="Middle Gap">
                  <Input
                    type="number"
                    min={0}
                    value={Math.round(target.groupSpacing)}
                    onChange={(e) => {
                      const groupSpacing = Math.max(0, parseFloat(e.target.value) || 0)
                      updateImageTime({
                        groupSpacing,
                        width: imageTimeDigitWidth(target) * segmentedCharCount(target) + totalSegmentGap({ ...target, groupSpacing }),
                      })
                    }}
                  />
                </GridPair>
              ) : null}
            </>
          ) : null}
          <div className="grid grid-cols-5 gap-2 border border-black/10 p-2">
            {requiredGlyphKeys(target).map((key) => {
              const asset = target.glyphs.find((item) => item.key === key)
              return (
                <div key={key} className="min-w-0 border border-black/15 bg-white p-2 text-center">
                  <GlyphPreviewLabel value={key} />
                  {asset ? (
                    <img src={asset.dataUrl} alt={`glyph ${key}`} className="mx-auto mt-1 h-8 w-auto object-contain" />
                  ) : (
                    <div className="mt-1 grid min-h-8 place-items-center break-words text-[10px] leading-tight text-black/35">
                      NA
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
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
      <input
        type="file"
        accept="image/png"
        multiple
        ref={digitInputRef}
        className="hidden"
        onChange={handleDigitUpload}
      />
    </div>
  )
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function parseGlyphKeyFromFileName(name: string) {
  const base = name.replace(/\.[^/.]+$/, '').trim().toUpperCase()
  if (/^[0-9A-Z]$/.test(base)) return base
  if (/^[A-Z]{3}$/.test(base)) return base
  const wordMatch = base.match(/(^|[^A-Z])(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC|SUN|MON|TUE|WED|THU|FRI|SAT)([^A-Z]|$)/)
  if (wordMatch?.[2]) return wordMatch[2]
  const charMatch = base.match(/(^|[^0-9A-Z])([0-9A-Z])([^0-9A-Z]|$)/)
  return charMatch?.[2] || null
}

function imageTimeDigitWidth(node: ImageTimeNode) {
  return Math.max(4, (node.width - totalSegmentGap(node)) / Math.max(1, segmentedCharCount(node)))
}

function usesSegmentedGlyphs(node: ImageTimeNode) {
  return !(node.mode === 'date' && node.dateFormat === 'MMM') && !(node.mode === 'week' && node.weekFormat === 'words')
}

function segmentedCharCount(node: ImageTimeNode) {
  if (node.mode === 'week') return 3
  if (node.mode === 'date' && (node.dateFormat === 'MM' || node.dateFormat === 'DD')) return 2
  return 4
}

function totalSegmentGap(node: ImageTimeNode) {
  const count = segmentedCharCount(node)
  if (count <= 1) return 0
  return count === 4 ? node.charSpacing * 2 + node.groupSpacing : node.charSpacing * (count - 1)
}

function requiredGlyphKeys(node: ImageTimeNode) {
  if (node.mode === 'week') {
    return node.weekFormat === 'words' ? [...WEEK_WORDS] : [...WEEK_LETTERS]
  }
  if (node.mode === 'date') {
    if (node.dateFormat === 'MMM') return [...MONTH_WORDS]
    return [...TIME_DIGITS]
  }
  return [...TIME_DIGITS]
}

function imageTimeUploadHelp(node: ImageTimeNode) {
  const lines = imageTimeUploadHelpLines(node)
  return (
    <div className="text-[10px] leading-relaxed">
      <div className="font-bold border-b border-black/10 mb-1.5 pb-1 font-sans text-black">
        File Naming
      </div>
      {lines.map((line) => (
        <div key={line} className="text-black/70">
          {line}
        </div>
      ))}
    </div>
  )
}

function imageTimeUploadHelpLines(node: ImageTimeNode) {
  if (node.mode === 'time') {
    return [
      'Upload PNG files for digits 0-9.',
      'Recommended names: 0.png, 1.png ... 9.png.',
    ]
  }
  if (node.mode === 'date') {
    if (node.dateFormat === 'MMM') {
      return [
        'Upload 12 PNG files for month names.',
        'Required names: JAN.png to DEC.png.',
        'Each file name should contain the full 3-letter month code.',
      ]
    }
    return [
      'Upload PNG files for digits 0-9.',
      'Recommended names: 0.png, 1.png ... 9.png.',
    ]
  }
  if (node.weekFormat === 'words') {
    return [
      'Upload 7 PNG files for weekday names.',
      'Required names: SUN.png, MON.png ... SAT.png.',
      'Each file name should contain the full 3-letter weekday code.',
    ]
  }
  return [
    'Upload PNG files for weekday letters.',
    'Required letters: A, D, E, F, H, I, M, N, O, R, S, T, U, W.',
    'Recommended names: M.png, O.png, N.png or letter-M.png style.',
  ]
}

function GlyphPreviewLabel({ value }: { value: string }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [stacked, setStacked] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element || value.length !== 3) {
      setStacked(false)
      return
    }

    const update = () => {
      const width = element.clientWidth
      setStacked(width < 26)
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [value])

  const compact = value.length === 3
  return (
    <div ref={ref} className="min-w-0 text-[10px] font-semibold text-black/50">
      <div className={compact && stacked ? 'hidden' : 'text-center whitespace-nowrap'}>
        {value}
      </div>
      {compact && stacked ? (
        <div className="flex flex-col items-center leading-none">
          {value.split('').map((char, index) => (
            <span key={`${value}-${index}`}>{char}</span>
          ))}
        </div>
      ) : null}
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
  <div className="grid grid-cols-[78px_minmax(0,1fr)] items-start gap-3">
    <div className="flex min-w-0 items-center gap-1.5">
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
    <div className="min-w-0">{children}</div>
  </div>
)
