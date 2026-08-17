import { Trash, AlertCircle, Info, Lock } from 'lucide-react'
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
import { parseGlyphKeyFromFileName } from '../lib/image-time'
import {
  buildCustomFontCharacterCoverage,
  customFontUsageKey,
  unsupportedCharacters,
} from '../lib/font-filter'
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
    aplitePreview,
    toggleAplite,
  } = useSceneStore()
  const target = useMemo(() => nodes.find((n) => n.id === selectedIds[0]), [nodes, selectedIds])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const digitInputRef = useRef<HTMLInputElement>(null)
  const [fontUploadError, setFontUploadError] = useState<string | null>(null)

  // Dynamic background based on element color, but kept light
  const bgTint =
    target && 'fill' in target
      ? (target as RectNode | TextNode | TimeNode).fill
      : backgroundColor || '#f0f0f0'

  const bgStyle = target ? { background: `linear-gradient(135deg, ${bgTint}11, #ffffff)` } : { background: '#ffffff' }

  const update = (key: SceneNodeKey, value: unknown) => {
    if (!target || target.locked) return
    updateNode(target.id, { [key]: value } as Partial<SceneNode>)
  }
  const updateTime = (key: TimeKeys, value: TimeNode[TimeKeys]) => {
    if (!target || target.locked || target.type !== 'time') return
    updateNode(target.id, { [key]: value } as Partial<SceneNode>)
  }
  const updateImageTime = (data: Partial<ImageTimeNode>) => {
    if (!target || target.locked || target.type !== 'image-time') return
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

    setFontUploadError(null)

    if (key.startsWith('custom-')) {
      const id = key.replace('custom-', '')
      const font = customFonts.find((f) => f.id === id)
      if (font) {
        if (isTime) {
          updateTime('fontFamily', font.name)
          updateTime('customFontId', id)
          updateTime('fontSize', 24)
          updateTime('fontFilter', 'extended')
        } else {
          update('fontFamily', font.name)
          update('customFontId', id)
          update('fontSize', 24)
          update('fontFilter', 'extended')
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
    if (!file.name.toLowerCase().endsWith('.ttf')) {
      setFontUploadError('Only TrueType (.ttf) fonts are supported by Pebble.')
      e.target.value = ''
      return
    }

    setFontUploadError(null)
    let id: string
    try {
      id = await addCustomFont(file)
    } catch (error) {
      setFontUploadError(error instanceof Error ? error.message : 'Unable to load this font.')
      e.target.value = ''
      return
    }

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
        } as Partial<SceneNode>)
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

    if (target.customFontId) {
      const coverage = buildCustomFontCharacterCoverage(nodes)
      const key = customFontUsageKey(target)
      const missing = unsupportedCharacters(text, key ? coverage.get(key) : undefined)
      if (missing.length > 0) return `Export filter excludes ${formatCharacters(missing)}`
      return null
    }

    const fontKey = getCurrentFontKey(target as TextNode | TimeNode)
    const font = SYSTEM_FONTS.find((f) => f.key === fontKey)
    if (!font || !font.regex) return null

    if (!new RegExp(font.regex).test(text)) {
      return 'Missing glyphs'
    }
    return null
  }, [nodes, target])

  if (!target) {
    return (
      <div className="inspector-content" style={bgStyle}>
        <InspectorSection title="Canvas">
          <ColorSelect label="Background" value={backgroundColor} onChange={setBackgroundColor} />
        </InspectorSection>

        <InspectorSection title="Preview">
          <div className="grid grid-cols-[90px_1fr] items-center gap-3">
            <div className="inspector-label">Aplite mono</div>
            <div className="flex h-9 items-center justify-end">
              <Switch
                checked={aplitePreview}
                onCheckedChange={toggleAplite}
                aria-label="Toggle Aplite monochrome preview"
              />
            </div>
          </div>
        </InspectorSection>

        <InspectorSection title="Compatibility">
          <div className="mb-2 inline-flex rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
            All Pebble models
          </div>
          <div className="text-[11px] leading-relaxed text-slate-500">
            The selected project size is only the design canvas. Export and preview include all supported Pebble resolutions.
          </div>
        </InspectorSection>
      </div>
    )
  }

  const isGPath = target.type === 'gpath'
  const showsStroke = target.type === 'rect' || target.type === 'gpath'
  const showsAppearance = 'fill' in target || showsStroke

  return (
    <div className="inspector-content" style={bgStyle}>
      <div className="inspector-selection-meta">
        <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {target.type}
        </span>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => removeNode(target.id)}
          disabled={target.locked}
          title="Remove"
          aria-label={`Remove ${target.name}`}
          className="ml-auto text-rose-500 hover:bg-rose-50 hover:text-rose-600"
        >
          <Trash size={16} />
        </Button>
      </div>

      {target.locked && (
        <div className="flex items-center gap-2 border-b border-indigo-100 bg-indigo-50 px-3 py-2 text-[11px] font-medium text-indigo-700">
          <Lock size={13} />
          Layer locked. Unlock it in Layers to edit.
        </div>
      )}

      <div
        className={target.locked ? 'pointer-events-none select-none opacity-50' : undefined}
        aria-disabled={target.locked || undefined}
      >

      <InspectorSection title="Transform">
        <div className="grid grid-cols-2 gap-2">
          <CompactField label="X">
            <Input
              type="number"
              value={Math.round(target.x)}
              onChange={(e) => update('x', parseFloat(e.target.value) || 0)}
            />
          </CompactField>
          <CompactField label="Y">
            <Input
              type="number"
              value={Math.round(target.y)}
              onChange={(e) => update('y', parseFloat(e.target.value) || 0)}
            />
          </CompactField>
          <CompactField label="W">
            <Input
              type="number"
              value={Math.round(target.width)}
              min={4}
              disabled={isGPath}
              title={isGPath ? 'Resize GPath via canvas handles' : undefined}
              onChange={(e) => update('width', Math.max(4, parseFloat(e.target.value) || 0))}
            />
          </CompactField>
          <CompactField label="H">
            <Input
              type="number"
              value={Math.round(target.height)}
              min={4}
              disabled={isGPath}
              title={isGPath ? 'Resize GPath via canvas handles' : undefined}
              onChange={(e) => update('height', Math.max(4, parseFloat(e.target.value) || 0))}
            />
          </CompactField>
        </div>
        {isGPath && (
          <GridPair label="Rotation">
            <Input
              type="number"
              value={Math.round(target.rotation)}
              onChange={(e) => update('rotation', parseFloat(e.target.value) || 0)}
            />
          </GridPair>
        )}
      </InspectorSection>

      {showsAppearance && (
        <InspectorSection title="Appearance">
          {'fill' in target && <ColorSelect label="Fill" value={target.fill} onChange={(c) => update('fill', c)} />}
          {showsStroke && <ColorSelect label="Stroke" value={target.stroke} onChange={(c) => update('stroke', c)} />}
          {showsStroke && (
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
        </InspectorSection>
      )}
      {target.type === 'text' && (
        <InspectorSection title="Text">
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
            {fontUploadError && (
              <div className="mt-1 flex items-center gap-1.5 text-[10px] text-red-500 font-medium leading-tight">
                <AlertCircle size={10} className="shrink-0" />
                {fontUploadError}
              </div>
            )}
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
        </InspectorSection>
      )}
      {target.type === 'time' && (
        <InspectorSection title="Time & Date">
          <GridPair label="Type">
            <select
              className="h-9 w-full border border-black bg-white px-3 text-sm text-black rounded-none focus:outline-none"
              value={target.text}
              onChange={(e) => {
                const newType = e.target.value as TimeNode['text']
                updateNode(target.id, {
                  text: newType,
                  format: timeFormatOptions[newType][0].id,
                } as Partial<TimeNode> as Partial<SceneNode>)
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
            {fontUploadError && (
              <div className="mt-1 flex items-center gap-1.5 text-[10px] text-red-500 font-medium leading-tight">
                <AlertCircle size={10} className="shrink-0" />
                {fontUploadError}
              </div>
            )}
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
                  onChange={(e) => updateTime('fontFilter', e.target.value as FontFilter)}
                >
                  {FONT_FILTERS.map(f => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
              </GridPair>
            </>
          )}
        </InspectorSection>
      )}
      {target.type === 'bitmap' && (
        <InspectorSection title="Image">
          <GridPair label="File">
            <div className="truncate text-sm text-slate-600">{target.fileName}</div>
          </GridPair>
        </InspectorSection>
      )}
      {target.type === 'image-time' && (
        <InspectorSection title="PNG Glyph Time">
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
        </InspectorSection>
      )}
      {target.type === 'gpath' && (
        <InspectorSection title="Vector Path">
          <GridPair label="Points">
            <div className="text-sm text-slate-600">{target.points.length}</div>
          </GridPair>
        </InspectorSection>
      )}
      <input
        type="file"
        accept=".ttf,font/ttf,application/x-font-ttf"
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

function formatCharacters(characters: string[]) {
  return characters
    .map((character) => {
      if (character === ' ') return 'space'
      if (character === '\n') return 'line break'
      if (character === '\t') return 'tab'
      return `“${character}”`
    })
    .join(', ')
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
    if (!element || value.length !== 3) return

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


const InspectorSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="inspector-section">
    <div className="inspector-section-title">{title}</div>
    <div className="space-y-2.5">{children}</div>
  </section>
)

const CompactField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="compact-field">
    <span>{label}</span>
    {children}
  </label>
)

const GridPair = ({
  label,
  helpContent,
  children,
}: {
  label: string
  helpContent?: React.ReactNode
  children: React.ReactNode
}) => (
  <div className="grid grid-cols-[78px_minmax(0,1fr)] items-center gap-3">
    <div className="flex min-w-0 items-center gap-1.5">
      <Label className="inspector-label">{label}</Label>
      {helpContent && (
        <div className="group relative flex items-center">
          <Info size={11} className="cursor-help text-slate-400 hover:text-slate-600" />
          <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 hidden w-52 rounded-lg border border-slate-200 bg-white p-3 shadow-xl group-hover:block">
            {helpContent}
          </div>
        </div>
      )}
    </div>
    <div className="min-w-0">{children}</div>
  </div>
)
