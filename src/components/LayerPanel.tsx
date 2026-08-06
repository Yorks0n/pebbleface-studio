import {
  ArrowDownToLine,
  ArrowUpToLine,
  Clock3,
  Image,
  Images,
  Layers,
  Lock,
  LockOpen,
  MoveDown,
  MoveUp,
  PenTool,
  Square,
  Trash,
  Type,
} from 'lucide-react'
import { Button } from './ui/button'
import { useSceneStore, type SceneNode } from '../store/scene'

const typeLabel: Record<SceneNode['type'], string> = {
  rect: 'Rectangle',
  text: 'Text',
  time: 'Time / Date',
  'image-time': 'PNG Glyph Time',
  bitmap: 'Image',
  gpath: 'GPath',
}

const typeIcon: Record<SceneNode['type'], typeof Square> = {
  rect: Square,
  text: Type,
  time: Clock3,
  'image-time': Images,
  bitmap: Image,
  gpath: PenTool,
}

export const LayerPanel = () => {
  const { nodes, moveLayer, selectedIds, setSelection, toggleNodeLock, removeNode } = useSceneStore()
  const ordered = [...nodes].reverse()
  const activeId = selectedIds[0]
  const activeNode = nodes.find((node) => node.id === activeId)

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="sidebar-tabs">
        <button className="sidebar-tab sidebar-tab-active" type="button">
          Layers
          <span>{nodes.length}</span>
        </button>
        <div className="ml-auto flex items-center pr-3 text-slate-400">
          <Layers size={15} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-2">
        {ordered.length === 0 ? (
          <div className="grid h-full min-h-52 place-items-center px-6 text-center">
            <div>
              <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-400">
                <Layers size={18} />
              </div>
              <p className="text-sm font-medium text-slate-700">No layers yet</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Add an element from the toolbar to start designing.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-0.5 px-2">
            {ordered.map((node, index) => {
              const isActive = selectedIds.includes(node.id)
              const Icon = typeIcon[node.type]
              return (
                <div
                  key={node.id}
                  className={`layer-row ${isActive ? 'layer-row-active' : ''} ${node.locked ? 'layer-row-locked' : ''}`}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 self-stretch text-left"
                    onClick={() => setSelection([node.id])}
                    aria-pressed={isActive}
                  >
                    <span className="layer-index">{nodes.length - index}</span>
                    <span className="layer-icon">
                      <Icon size={14} />
                    </span>
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-xs font-medium text-slate-800">{node.name}</span>
                      <span className="block truncate text-[10px] text-slate-400">{typeLabel[node.type]}</span>
                    </span>
                  </button>
                  {node.locked && (
                    <button
                      type="button"
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-white hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
                      onClick={() => toggleNodeLock(node.id)}
                      title={`Unlock ${node.name}`}
                      aria-label={`Unlock ${node.name}`}
                    >
                      <Lock size={14} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="layer-actions">
        <div className="mb-2 min-w-0 truncate px-1 text-[10px] text-slate-400">
          {activeNode ? activeNode.name : 'Select a layer to arrange it'}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            disabled={!activeId || activeNode?.locked}
            onClick={() => activeId && moveLayer(activeId, 'top')}
            title="Move to top"
            aria-label="Move selected layer to top"
          >
            <ArrowUpToLine size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={!activeId || activeNode?.locked}
            onClick={() => activeId && moveLayer(activeId, 'up')}
            title="Move up"
            aria-label="Move selected layer up"
          >
            <MoveUp size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={!activeId || activeNode?.locked}
            onClick={() => activeId && moveLayer(activeId, 'down')}
            title="Move down"
            aria-label="Move selected layer down"
          >
            <MoveDown size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={!activeId || activeNode?.locked}
            onClick={() => activeId && moveLayer(activeId, 'bottom')}
            title="Move to bottom"
            aria-label="Move selected layer to bottom"
          >
            <ArrowDownToLine size={14} />
          </Button>
          <div className="mx-1 h-5 w-px bg-slate-200" />
          <Button
            variant="ghost"
            size="icon"
            disabled={!activeId}
            onClick={() => activeId && toggleNodeLock(activeId)}
            title={activeNode?.locked ? 'Unlock layer' : 'Lock layer'}
            aria-label={activeNode?.locked ? 'Unlock selected layer' : 'Lock selected layer'}
            className={`ml-auto ${activeNode?.locked ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' : 'text-slate-500'}`}
          >
            {activeNode?.locked ? <LockOpen size={14} /> : <Lock size={14} />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={!activeId || activeNode?.locked}
            onClick={() => activeId && removeNode(activeId)}
            title="Delete layer"
            aria-label="Delete selected layer"
            className="text-rose-500 hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash size={14} />
          </Button>
        </div>
      </div>
    </div>
  )
}
