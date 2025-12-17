import { ArrowDownToLine, ArrowUpToLine, Layers, MoveDown, MoveUp, Trash } from 'lucide-react'
import { Button } from './ui/button'
import { useSceneStore } from '../store/scene'

const typeLabel: Record<'rect' | 'text' | 'bitmap' | 'time', string> = {
  rect: 'Rect',
  text: 'Text',
  time: 'Time/Date',
  bitmap: 'Bitmap',
}

export const LayerPanel = () => {
  const { nodes, moveLayer, selectedIds, setSelection, removeNode } = useSceneStore()
  const ordered = [...nodes].reverse()
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Layers size={16} />
        图层
      </div>
      <div className="space-y-2 max-h-72 overflow-auto pr-1 scrollbar-thin">
        {ordered.map((node, index) => {
          const isActive = selectedIds.includes(node.id)
          return (
            <div
              key={node.id}
              className={`rounded-lg border px-3 py-2 text-sm transition ${
                isActive ? 'border-indigo-400/80 bg-indigo-500/10' : 'border-white/10 bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-medium">{node.name}</span>
                  <span className="text-[11px] uppercase text-white/50">
                    {typeLabel[node.type]} • #{index + 1}
                  </span>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => moveLayer(node.id, 'top')} title="置顶">
                    <ArrowUpToLine size={15} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => moveLayer(node.id, 'up')} title="上移">
                    <MoveUp size={15} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => moveLayer(node.id, 'down')} title="下移">
                    <MoveDown size={15} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => moveLayer(node.id, 'bottom')} title="置底">
                    <ArrowDownToLine size={15} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeNode(node.id)}
                    title="删除"
                    className="text-red-300 hover:text-red-100"
                  >
                    <Trash size={15} />
                  </Button>
                </div>
              </div>
              <button
                className="mt-2 w-full rounded-md bg-black/30 px-2 py-1 text-xs text-white/70 hover:bg-black/40 transition"
                onClick={() => setSelection([node.id])}
              >
                选中
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
