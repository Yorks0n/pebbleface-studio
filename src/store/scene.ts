import { create } from 'zustand'
import { apliteColor, uid } from '../lib/utils'
import { defaultFill, defaultStroke } from '../lib/color-dict'

export type Tool = 'select' | 'rect' | 'text' | 'image' | 'time'

export type BaseNode = {
  id: string
  name: string
  type: 'rect' | 'text' | 'bitmap' | 'time'
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

export type TextNode = BaseNode & {
  type: 'text'
  fill: string
  text: string
  fontSize: number
  fontFamily: string
}

export type TimeNode = BaseNode & {
  type: 'time'
  fill: string
  text: 'time' | 'date'
  format: TimeFormatId
  fontSize: number
  fontFamily: string
}

export type BitmapNode = BaseNode & {
  type: 'bitmap'
  dataUrl: string
  fileName: string
  file?: File | null
}

export type SceneNode = RectNode | TextNode | BitmapNode | TimeNode

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

export type SceneState = {
  nodes: SceneNode[]
  selectedIds: string[]
  tool: Tool
  aplitePreview: boolean
  stage: { width: number; height: number }
  setTool: (tool: Tool) => void
  toggleAplite: () => void
  setSelection: (ids: string[]) => void
  addRect: (x: number, y: number) => void
  addText: (x: number, y: number) => void
  addTimeText: (x: number, y: number) => void
  addBitmap: (node: Omit<BitmapNode, keyof BaseNode | 'type'> & Partial<BaseNode>) => void
  updateNode: (id: string, data: Partial<SceneNode>) => void
  removeNode: (id: string) => void
  moveLayer: (id: string, direction: 'up' | 'down' | 'top' | 'bottom') => void
}

export const allowedFonts = ['Raster Gothic', 'Gotham (Bitham)', 'Droid Serif', 'LECO 1976']

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
      fontFamily: allowedFonts[0],
      fontSize: 20,
    },
  ],
  selectedIds: [],
  tool: 'select',
  aplitePreview: false,
  stage: { width: 200, height: 228 },
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
            fontFamily: allowedFonts[0],
            fontSize: 18,
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
            fontFamily: allowedFonts[0],
            fontSize: 20,
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
  ],
}

function fmt(date: Date, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-US', opts).format(date)
}

function dateParts(date: Date, pattern: string) {
  const pad = (n: number, l = 2) => n.toString().padStart(l, '0')
  const map: Record<string, string> = {
    yyyy: pad(date.getFullYear(), 4),
    MM: pad(date.getMonth() + 1),
    dd: pad(date.getDate()),
    EEE: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date),
    MMM: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date),
    d: date.getDate().toString(),
  }
  return pattern
    .replace(/yyyy|MM|dd|EEE|MMM|d/g, (token) => map[token] || token)
    .replace(/\/{2,}/g, '/')
}
