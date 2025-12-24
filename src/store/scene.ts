import { create } from 'zustand'
import { apliteColor, uid, randomUuid } from '../lib/utils'
import { defaultFill, defaultStroke } from '../lib/color-dict'

export type Tool = 'select' | 'rect' | 'text' | 'image' | 'time' | 'gpath'

export type BaseNode = {
  id: string
  name: string
  type: 'rect' | 'text' | 'bitmap' | 'time' | 'gpath'
  x: number
  y: number
  width: number
  height: number
  rotation: number
  stroke: string
  strokeWidth: number
}

export type RectNode = BaseNode & {
  type: 'rect'
  fill: string
}

export type FontFilter = 'digits' | 'standard' | 'extended' | 'none'

export type TextNode = BaseNode & {
  type: 'text'
  fill: string
  text: string
  fontSize: number
  fontFamily: string
  bold?: boolean
  customFontId?: string
  fontFilter?: FontFilter
}

export type TimeNode = BaseNode & {
  type: 'time'
  fill: string
  text: 'time' | 'date'
  format: TimeFormatId
  customFormat?: string
  fontSize: number
  fontFamily: string
  bold?: boolean
  customFontId?: string
  fontFilter?: FontFilter
}

export type BitmapNode = BaseNode & {
  type: 'bitmap'
  dataUrl: string
  fileName: string
  file?: File | null
}

export type GPathNode = BaseNode & {
  type: 'gpath'
  points: { x: number; y: number }[]
}

export type SceneNode = RectNode | TextNode | BitmapNode | TimeNode | GPathNode

export type TimeFormatId =
  | 'HH:mm'
  | 'HH:mm:ss'
  | 'hh:mm a'
  | 'hh:mm:ss a'
  | 'YYYY-MM-DD'
  | 'ddd, MMM D'
  | 'MMM D, YYYY'
  | 'DD/MM/YYYY'
  | 'MM/DD/YYYY'
  | 'custom'

export type CustomFont = {
  id: string
  name: string
  file: File | null // Nullable for imported projects
  dataUrl: string // For previewing in browser (loaded as @font-face)
}

export interface ProjectFile {
  fileType: 'pebble-face-studio-project'
  version: number
  timestamp: number
  meta: {
    name: string
    uuid: string
    targetPlatforms: string[]
    dimensions: {
      width: number
      height: number
    }
    backgroundColor: string
  }
  resources: {
    fonts: { id: string; name: string; dataUrl: string }[]
  }
  scene: Omit<SceneNode, 'file'>[]
}

export type SceneState = {
  nodes: SceneNode[]
  customFonts: CustomFont[]
  selectedIds: string[]
  tool: Tool
  aplitePreview: boolean
  stage: { width: number; height: number }
  isInitialized: boolean
  projectName: string
  projectUuid: string
  backgroundColor: string
  targetPlatforms: string[]
  setProjectSettings: (width: number, height: number, platforms: string[], name: string) => void
  setProjectName: (name: string) => void
  setBackgroundColor: (color: string) => void
  setTool: (tool: Tool) => void
  toggleAplite: () => void
  setSelection: (ids: string[]) => void
  addRect: (x: number, y: number) => void
  addText: (x: number, y: number) => void
  addTimeText: (x: number, y: number) => void
  addBitmap: (node: Omit<BitmapNode, keyof BaseNode | 'type'> & Partial<BaseNode>) => void
  addCustomFont: (file: File) => Promise<string>
  loadProject: (file: ProjectFile) => Promise<void>
  addGPath: (point: { x: number; y: number }) => string
  appendGPathPoint: (id: string, point: { x: number; y: number }) => void
  updateNode: (id: string, data: Partial<SceneNode>) => void
  removeNode: (id: string) => void
  moveLayer: (id: string, direction: 'up' | 'down' | 'top' | 'bottom') => void
}

export const allowedFonts = ['Raster Gothic', 'Gotham (Bitham)', 'Droid Serif', 'LECO 1976']

export type PebbleFont = {
  label: string
  family: string
  size: number
  key: string
  regex?: string
}

export const SYSTEM_FONTS: PebbleFont[] = [
  // Raster Gothic
  { label: 'Gothic 14', family: 'Raster Gothic', size: 14, key: 'FONT_KEY_GOTHIC_14' },
  { label: 'Gothic 14 Bold', family: 'Raster Gothic', size: 14, key: 'FONT_KEY_GOTHIC_14_BOLD' },
  { label: 'Gothic 18', family: 'Raster Gothic', size: 18, key: 'FONT_KEY_GOTHIC_18' },
  { label: 'Gothic 18 Bold', family: 'Raster Gothic', size: 18, key: 'FONT_KEY_GOTHIC_18_BOLD' },
  { label: 'Gothic 24', family: 'Raster Gothic', size: 24, key: 'FONT_KEY_GOTHIC_24' },
  { label: 'Gothic 24 Bold', family: 'Raster Gothic', size: 24, key: 'FONT_KEY_GOTHIC_24_BOLD' },
  { label: 'Gothic 28', family: 'Raster Gothic', size: 28, key: 'FONT_KEY_GOTHIC_28' },
  { label: 'Gothic 28 Bold', family: 'Raster Gothic', size: 28, key: 'FONT_KEY_GOTHIC_28_BOLD' },
  
  // Bitham
  { label: 'Bitham 30 Black', family: 'Gotham Black', size: 30, key: 'FONT_KEY_BITHAM_30_BLACK' },
  { label: 'Bitham 34 Medium (Numbers)', family: 'Gotham Medium', size: 34, key: 'FONT_KEY_BITHAM_34_MEDIUM_NUMBERS', regex: '^[0-9:\\-\\.\\s]*$' },
  { label: 'Bitham 42 Bold', family: 'Gotham Bold', size: 42, key: 'FONT_KEY_BITHAM_42_BOLD' },
  { label: 'Bitham 42 Light', family: 'Gotham Light', size: 42, key: 'FONT_KEY_BITHAM_42_LIGHT' },
  { label: 'Bitham 42 Medium (Numbers)', family: 'Gotham Medium', size: 42, key: 'FONT_KEY_BITHAM_42_MEDIUM_NUMBERS', regex: '^[0-9:\\-\\.\\s]*$' },

  // Droid Serif & Roboto
  { label: 'Roboto Condensed 21', family: 'Roboto Condensed', size: 21, key: 'FONT_KEY_ROBOTO_CONDENSED_21' },
  { label: 'Roboto Bold Subset 49', family: 'Roboto Bold', size: 49, key: 'FONT_KEY_ROBOTO_BOLD_SUBSET_49', regex: '^[0-9:\\-\\.\\s]*$' },
  { label: 'Droid Serif 28 Bold', family: 'Droid Serif Bold', size: 28, key: 'FONT_KEY_DROID_SERIF_28_BOLD' },

  // LECO
  { label: 'LECO 20 Bold (Numbers)', family: 'LECO 1976', size: 20, key: 'FONT_KEY_LECO_20_BOLD_NUMBERS', regex: '^[0-9:\\-\\.\\s]*$' },
  { label: 'LECO 26 Bold (Numbers AM/PM)', family: 'LECO 1976', size: 26, key: 'FONT_KEY_LECO_26_BOLD_NUMBERS_AM_PM', regex: '^[0-9:\\-\\.\\sAaPpMm]*$' },
  { label: 'LECO 28 Light (Numbers)', family: 'LECO 1976', size: 28, key: 'FONT_KEY_LECO_28_LIGHT_NUMBERS', regex: '^[0-9:\\-\\.\\s]*$' },
  { label: 'LECO 32 Bold (Numbers)', family: 'LECO 1976', size: 32, key: 'FONT_KEY_LECO_32_BOLD_NUMBERS', regex: '^[0-9:\\-\\.\\s]*$' },
  { label: 'LECO 36 Bold (Numbers)', family: 'LECO 1976', size: 36, key: 'FONT_KEY_LECO_36_BOLD_NUMBERS', regex: '^[0-9:\\-\\.\\s]*$' },
  { label: 'LECO 38 Bold (Numbers)', family: 'LECO 1976', size: 38, key: 'FONT_KEY_LECO_38_BOLD_NUMBERS', regex: '^[0-9:\\-\\.\\s]*$' },
  { label: 'LECO 42 (Numbers)', family: 'LECO 1976', size: 42, key: 'FONT_KEY_LECO_42_NUMBERS', regex: '^[0-9:\\-\\.\\s]*$' },
]

export const useSceneStore = create<SceneState>((set, get) => ({
  nodes: [
    {
      id: uid('rect'),
      name: 'Rect 1',
      type: 'rect',
      x: 32,
      y: 40,
      width: 80,
      height: 48,
      rotation: 0,
      fill: '#40b1ff',
      stroke: defaultStroke,
      strokeWidth: 1,
    },
    {
      id: uid('time'),
      name: 'Time',
      type: 'time',
      x: 40,
      y: 110,
      width: 140,
      height: 32,
      rotation: 0,
      fill: '#ffffff',
      stroke: defaultStroke,
      strokeWidth: 0,
      text: 'time',
      format: 'HH:mm',
      fontFamily: SYSTEM_FONTS[0].family,
      fontSize: SYSTEM_FONTS[0].size,
      bold: false,
    },
  ],
  customFonts: [],
  selectedIds: [],
  tool: 'select',
  aplitePreview: false,
  stage: { width: 144, height: 168 },
  isInitialized: false,
  projectName: '',
  projectUuid: '',
  backgroundColor: '#000000',
  targetPlatforms: ['aplite', 'basalt'],
  setProjectSettings: (width, height, platforms, name) =>
    set({
      stage: { width, height },
      targetPlatforms: platforms,
      projectName: name || 'pebble-watchface',
      projectUuid: randomUuid(),
      backgroundColor: '#000000',
      isInitialized: true,
      nodes: [], // Clear default nodes on new project
    }),
  setProjectName: (name) => set({ projectName: name }),
  setBackgroundColor: (color) => set({ backgroundColor: color }),
  setTool: (tool) => set({ tool }),
  toggleAplite: () => set((state) => ({ aplitePreview: !state.aplitePreview })),
  setSelection: (ids) => set({ selectedIds: ids }),
  addRect: (x, y) =>
    set((state) => {
      const id = uid('rect')
      return {
        nodes: [
          ...state.nodes,
          {
            id,
            name: `Rect ${state.nodes.filter((n) => n.type === 'rect').length + 1}`,
            type: 'rect',
            x,
            y,
            width: 64,
            height: 48,
            rotation: 0,
            fill: defaultFill,
            stroke: defaultStroke,
            strokeWidth: 1,
          },
        ],
        selectedIds: [id],
        tool: 'select',
      }
    }),
  addText: (x, y) =>
    set((state) => {
      const id = uid('text')
      return {
        nodes: [
          ...state.nodes,
          {
            id,
            name: `Text ${state.nodes.filter((n) => n.type === 'text').length + 1}`,
            type: 'text',
            x,
            y,
            width: 120,
            height: 36,
            rotation: 0,
            fill: '#ffffff',
            stroke: defaultStroke,
            strokeWidth: 0,
            text: 'New text',
            fontFamily: SYSTEM_FONTS[0].family,
            fontSize: SYSTEM_FONTS[0].size,
            bold: false,
          },
        ],
        selectedIds: [id],
        tool: 'select',
      }
    }),
  addTimeText: (x, y) =>
    set((state) => {
      const id = uid('time')
      return {
        nodes: [
          ...state.nodes,
          {
            id,
            name: `Time ${state.nodes.filter((n) => n.type === 'time').length + 1}`,
            type: 'time',
            x,
            y,
            width: 140,
            height: 36,
            rotation: 0,
            fill: '#ffffff',
            stroke: defaultStroke,
            strokeWidth: 0,
            text: 'time',
            format: 'HH:mm',
            fontFamily: SYSTEM_FONTS[0].family,
            fontSize: SYSTEM_FONTS[0].size,
            bold: false,
          },
        ],
        selectedIds: [id],
        tool: 'select',
      }
    }),
  addBitmap: (bitmap) =>
    set((state) => {
      const count = state.nodes.filter((n) => n.type === 'bitmap').length + 1
      const id = uid('bitmap')
      return {
        nodes: [
          ...state.nodes,
          {
            id,
            name: bitmap.name || `Bitmap ${count}`,
            type: 'bitmap',
            x: bitmap.x ?? 20,
            y: bitmap.y ?? 20,
            width: bitmap.width ?? 80,
            height: bitmap.height ?? 80,
            rotation: 0,
            stroke: defaultStroke,
            strokeWidth: 0,
            dataUrl: bitmap.dataUrl,
            fileName: bitmap.fileName || `bitmap-${count}.png`,
            file: bitmap.file ?? null,
          },
        ],
        selectedIds: [id],
        tool: 'select',
      }
    }),
  addCustomFont: async (file) => {
    // Read file as DataURL
    const reader = new FileReader()
    const dataUrl = await new Promise<string>((resolve) => {
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(file)
    })
    
    const fontName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '')
    const fontId = uid('font')
    
    await injectFontFace(fontName, dataUrl)

    set((state) => ({
      customFonts: [
        ...state.customFonts,
        {
          id: fontId,
          name: fontName,
          file,
          dataUrl
        }
      ]
    }))
    
    return fontId
  },
  loadProject: async (file) => {
    // 1. Restore Fonts
    for (const font of file.resources.fonts) {
      await injectFontFace(font.name, font.dataUrl)
    }

    // 2. Restore State
    set({
      projectName: file.meta.name,
      projectUuid: file.meta.uuid,
      targetPlatforms: file.meta.targetPlatforms,
      stage: file.meta.dimensions,
      backgroundColor: file.meta.backgroundColor,
      customFonts: file.resources.fonts.map(f => ({ ...f, file: null })),
      nodes: file.scene.map(n => ({ ...n, file: null })) as SceneNode[],
      isInitialized: true,
      selectedIds: [],
      tool: 'select'
    })
  },
  addGPath: (point) => {
    const id = uid('gpath')
    set((state) => {
      const normalized = normalizeGPathPoints([{ x: point.x, y: point.y }])
      return {
        nodes: [
          ...state.nodes,
          {
            id,
            name: `Path ${state.nodes.filter((n) => n.type === 'gpath').length + 1}`,
            type: 'gpath',
            x: normalized.origin.x,
            y: normalized.origin.y,
            width: normalized.width,
            height: normalized.height,
            rotation: 0,
            stroke: '#ffffff',
            strokeWidth: 1,
            points: normalized.points,
          },
        ],
        selectedIds: [id],
        tool: 'gpath',
      }
    })
    return id
  },
  appendGPathPoint: (id, point) =>
    set((state) => {
      const nodes = state.nodes.map((n) => {
        if (n.id !== id || n.type !== 'gpath') return n
        const absolutePoints = n.points.map((p) => ({ x: n.x + p.x, y: n.y + p.y }))
        absolutePoints.push(point)
        const normalized = normalizeGPathPoints(absolutePoints)
        return {
          ...n,
          x: normalized.origin.x,
          y: normalized.origin.y,
          width: normalized.width,
          height: normalized.height,
          points: normalized.points,
        }
      }) as SceneNode[]
      return { nodes, selectedIds: [id] }
    }),
  updateNode: (id, data) =>
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? ({ ...n, ...data } as SceneNode) : n)) as SceneNode[],
    })),
  removeNode: (id) =>
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      selectedIds: state.selectedIds.filter((sid) => sid !== id),
    })),
  moveLayer: (id, direction) => set({ nodes: reorderNodes(get().nodes, id, direction) as SceneNode[] }),
}))

export const getDisplayColor = (color: string, aplite: boolean) =>
  aplite ? apliteColor(color || '#ffffff') : color

export const normalizeGPathPoints = (absolutePoints: { x: number; y: number }[]) => {
  if (absolutePoints.length === 0) {
    return { origin: { x: 0, y: 0 }, points: [], width: 1, height: 1 }
  }
  const xs = absolutePoints.map((p) => p.x)
  const ys = absolutePoints.map((p) => p.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)
  const normalizedPoints = absolutePoints.map((p) => ({ x: p.x - minX, y: p.y - minY }))
  const width = Math.max(1, maxX - minX || 1)
  const height = Math.max(1, maxY - minY || 1)
  return { origin: { x: minX, y: minY }, points: normalizedPoints, width, height }
}

function reorderNodes(nodes: SceneNode[], id: string, direction: 'up' | 'down' | 'top' | 'bottom') {
  const index = nodes.findIndex((n) => n.id === id)
  if (index === -1) return nodes
  const list = [...nodes]
  const [node] = list.splice(index, 1)
  if (!node) return nodes
  if (direction === 'up') list.splice(Math.min(index + 1, list.length), 0, node)
  if (direction === 'down') list.splice(Math.max(index - 1, 0), 0, node)
  if (direction === 'top') list.push(node)
  if (direction === 'bottom') list.unshift(node)
  return list
}

export const timeFormatOptions: Record<
  TimeNode['text'],
  { id: TimeFormatId; label: string; formatter: (d: Date) => string }[]
> = {
  time: [
    { id: 'HH:mm', label: '24h HH:mm', formatter: (d) => fmt(d, { hour12: false, hour: '2-digit', minute: '2-digit' }) },
    {
      id: 'HH:mm:ss',
      label: '24h HH:mm:ss',
      formatter: (d) => fmt(d, { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    },
    { id: 'hh:mm a', label: '12h hh:mm AM/PM', formatter: (d) => fmt(d, { hour12: true, hour: '2-digit', minute: '2-digit' }) },
    {
      id: 'hh:mm:ss a',
      label: '12h hh:mm:ss AM/PM',
      formatter: (d) => fmt(d, { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    },
  ],
  date: [
    { id: 'YYYY-MM-DD', label: 'YYYY-MM-DD', formatter: (d) => dateParts(d, 'yyyy-MM-dd') },
    { id: 'DD/MM/YYYY', label: 'DD/MM/YYYY', formatter: (d) => dateParts(d, 'dd/MM/yyyy') },
    { id: 'MM/DD/YYYY', label: 'MM/DD/YYYY', formatter: (d) => dateParts(d, 'MM/dd/yyyy') },
    { id: 'ddd, MMM D', label: 'Wed, Jan 3', formatter: (d) => dateParts(d, 'EEE, MMM d') },
    { id: 'MMM D, YYYY', label: 'Jan 3, 2024', formatter: (d) => dateParts(d, 'MMM d, yyyy') },
    { id: 'custom', label: 'Custom...', formatter: () => '' },
  ],
}

// Export dateParts so it can be used in components
export { dateParts }

function fmt(date: Date, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-US', opts).format(date)
}

function dateParts(date: Date, pattern: string) {
  const pad = (n: number, l = 2) => n.toString().padStart(l, '0')
  const map: Record<string, string> = {
    yyyy: pad(date.getFullYear(), 4),
    yy: pad(date.getFullYear() % 100, 2),
    MMM: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date).toUpperCase(),
    mmm: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date), // Dec
    MM: pad(date.getMonth() + 1),
    M: (date.getMonth() + 1).toString(),
    dd: pad(date.getDate()),
    d: date.getDate().toString(),
    EEE: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date),
  }
  // Order matters: match longer tokens first!
  // MMM before MM before M
  // mmm before mm (if exists)
  // yyyy before yy
  // dd before d
  return pattern
    .replace(/yyyy|yy|MMM|mmm|EEE|MM|M|dd|d/g, (token) => map[token] || token)
}

async function injectFontFace(name: string, dataUrl: string) {
  const style = document.createElement('style')
  style.textContent = `
    @font-face {
      font-family: "${name}";
      src: url("${dataUrl}");
    }
  `
  document.head.appendChild(style)
  
  // Wait for font to load via a dummy element
  const div = document.createElement('div')
  div.style.fontFamily = name
  div.textContent = 'Loading...'
  div.style.position = 'absolute'
  div.style.top = '-9999px'
  document.body.appendChild(div)
  await new Promise(r => setTimeout(r, 100))
  document.body.removeChild(div)
}
