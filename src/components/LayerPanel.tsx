import { ArrowDownToLine, ArrowUpToLine, Layers, MoveDown, MoveUp, Trash } from 'lucide-react'
import { Button } from './ui/button'
import { useSceneStore } from '../store/scene'

const typeLabel: Record<'rect' | 'text' | 'bitmap' | 'time' | 'gpath', string> = {
  rect: 'Rect',
  text: 'Text',
  time: 'Time/Date',
  bitmap: 'Bitmap',
  gpath: 'GPath',
}

export const LayerPanel = () => {
  const { nodes, moveLayer, selectedIds, setSelection, removeNode } = useSceneStore()
  const ordered = [...nodes].reverse()
  return (
    <div className="space-y-2 flex flex-col h-full w-full">
      <div className="flex items-center gap-2 text-sm font-semibold text-black shrink-0">
        <Layers size={16} />
        Layers
      </div>
      <div className="space-y-2 flex-1 overflow-auto pr-1 scrollbar-thin">
        {ordered.map((node, index) => {
          const isActive = selectedIds.includes(node.id)
          return (
            <div
              key={node.id}
              className={`rounded-none border px-3 py-2 text-sm transition ${
                isActive ? 'border-black bg-[#eee]' : 'border-[#ddd] bg-white hover:border-[#aaa]'
              }`}
              onClick={() => setSelection([node.id])}
              role="button"
              tabIndex={0}
            >
              <div className="flex items-center justify-between">
                <div className="flex flex-col min-w-0">
                  <span className="font-medium text-black truncate">{node.name}</span>
                  <span className="text-[11px] uppercase text-black/50">
                    {typeLabel[node.type]} • #{index + 1}
                  </span>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex gap-0.5 text-black">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      moveLayer(node.id, 'top')
                    }}
                    title="Move to top"
                    className="h-8 w-8 p-0"
                  >
                    <ArrowUpToLine size={13} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      moveLayer(node.id, 'up')
                    }}
                    title="Move up"
                    className="h-8 w-8 p-0"
                  >
                    <MoveUp size={13} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      moveLayer(node.id, 'down')
                    }}
                    title="Move down"
                    className="h-8 w-8 p-0"
                  >
                    <MoveDown size={13} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      moveLayer(node.id, 'bottom')
                    }}
                    title="Move to bottom"
                    className="h-8 w-8 p-0"
                  >
                    <ArrowDownToLine size={13} />
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeNode(node.id)
                  }}
                  title="Remove"
                  className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                >
                  <Trash size={13} />
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
