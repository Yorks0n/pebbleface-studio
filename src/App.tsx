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
import { NewProjectWizard } from './components/NewProjectWizard'
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
      <NewProjectWizard />
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Pebble Face Studio</p>
          <h1 className="font-display text-3xl md:text-4xl font-semibold">
            Visual Editor MVP for Pebble Watchfaces
          </h1>
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

      <main className="grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr_260px] lg:grid-cols-[240px_1fr_280px] xl:grid-cols-[260px_1fr_300px] items-stretch">
        <div className="glass-panel rounded-3xl p-4 h-full flex">
          <LayerPanel />
        </div>
        <div className="glass-panel rounded-3xl p-3 flex flex-col gap-3 h-full">
          <CanvasStage />
          <Toolbar />
        </div>
        <div className="glass-panel rounded-3xl p-4 h-full flex flex-col">
          <PropertiesPanel />
        </div>
      </main>
    </div>
  )
}

export default App
