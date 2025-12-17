import { useState } from 'react'
import { Download } from 'lucide-react'
import { Toolbar } from './components/Toolbar'
import { CanvasStage } from './components/CanvasStage'
import { PropertiesPanel } from './components/PropertiesPanel'
import { LayerPanel } from './components/LayerPanel'
import { Switch } from './components/ui/switch'
import { Button } from './components/ui/button'
import { useSceneStore } from './store/scene'
import { exportPebbleProject } from './utils/exporter'
import './index.css'

function App() {
  const { aplitePreview, toggleAplite, nodes } = useSceneStore()
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    try {
      setExporting(true)
      await exportPebbleProject(nodes, 'pebble-watchface')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-screen p-6 md:p-10 flex flex-col gap-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Pebble Face Studio</p>
          <h1 className="font-display text-3xl md:text-4xl font-semibold">
            Visual Editor MVP for Pebble Watchfaces
          </h1>
          <p className="text-white/70 max-w-2xl">
            左侧选择工具，中间画布 200×228，右侧属性与图层。拖拽、缩放、旋转，导出 Pebble SDK 项目 zip。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
            <span className="text-sm text-white/80">Aplite 黑白预览</span>
            <Switch checked={aplitePreview} onClick={toggleAplite} />
          </div>
          <Button onClick={handleExport} disabled={exporting} size="lg">
            <Download size={16} />
            {exporting ? '导出中...' : 'Export Pebble Project (zip)'}
          </Button>
        </div>
      </header>

      <main className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr_320px] items-start">
        <Toolbar />
        <div className="glass-panel rounded-3xl p-4 flex flex-col gap-4">
          <CanvasStage />
          <div className="grid grid-cols-2 gap-3 text-sm text-white/70">
            <div className="rounded-xl bg-black/40 p-3 border border-white/5">
              <p className="text-xs uppercase text-white/60">提示</p>
              点击空白处放置 Rect/Text；Shift 可多选，Transformer 框选缩放。
            </div>
            <div className="rounded-xl bg-black/40 p-3 border border-white/5">
              <p className="text-xs uppercase text-white/60">导出</p>
              资源会写入 appinfo.json 和 resources/images，并生成 src/main.c 框架。
            </div>
          </div>
        </div>
        <div className="glass-panel rounded-3xl p-4 space-y-6">
          <PropertiesPanel />
          <LayerPanel />
        </div>
      </main>
    </div>
  )
}

export default App
