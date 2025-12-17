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
            Use the toolbar to drop shapes, time, text, and bitmaps on the 200×228 canvas. Adjust properties and layers,
            then export a Pebble SDK-ready zip.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
            <span className="text-sm text-white/80">Aplite monochrome preview</span>
            <Switch checked={aplitePreview} onClick={toggleAplite} />
          </div>
          <Button onClick={handleExport} disabled={exporting} size="lg">
            <Download size={16} />
            {exporting ? 'Exporting...' : 'Export Pebble Project (zip)'}
          </Button>
        </div>
      </header>

      <main className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr_320px] xl:grid-cols-[340px_1fr_360px] items-start">
        <Toolbar />
        <div className="glass-panel rounded-3xl p-4 flex flex-col gap-4">
          <CanvasStage />
          <div className="grid grid-cols-2 gap-3 text-sm text-white/70">
            <div className="rounded-xl bg-black/40 p-3 border border-white/5">
              <p className="text-xs uppercase text-white/60">Tips</p>
              Click canvas to place Rect/Text/Time. Hold Shift to multi-select and transform.
            </div>
            <div className="rounded-xl bg-black/40 p-3 border border-white/5">
              <p className="text-xs uppercase text-white/60">Export</p>
              Generates Pebble SDK layout in `src/main.c`, `package.json`, `wscript`, and copies images to resources.
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
