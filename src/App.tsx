import { useState, useRef, useEffect } from 'react'
import { Download, Pencil, Save } from 'lucide-react'
import { Toolbar } from './components/Toolbar'
import { CanvasStage } from './components/CanvasStage'
import { PropertiesPanel } from './components/PropertiesPanel'
import { LayerPanel } from './components/LayerPanel'
import { Switch } from './components/ui/switch'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { useSceneStore } from './store/scene'
import { saveProjectFile, exportPebbleProject } from './utils/exporter'
import { NewProjectWizard } from './components/NewProjectWizard'
import { FontPreloader } from './components/FontPreloader'
import './index.css'

function App() {
  const { aplitePreview, toggleAplite, nodes, projectName, setProjectName } = useSceneStore()
  const [exporting, setExporting] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditingName])

  const handleNameBlur = () => {
    setIsEditingName(false)
    if (!projectName.trim()) setProjectName('Untitled Project')
  }

  const handleExport = async () => {
    try {
      setExporting(true)
      await exportPebbleProject(nodes, projectName || 'pebble-watchface')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-screen p-6 md:p-10 flex flex-col gap-6">
      <FontPreloader />
      <NewProjectWizard />
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-black/60">
            Pebble Face Studio
          </p>
          {isEditingName ? (
            <Input
              ref={inputRef}
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
              className="font-display text-3xl md:text-4xl font-semibold h-auto py-1 px-2 -ml-2 border-b-2 border-black rounded-none border-t-0 border-x-0 bg-transparent focus-visible:ring-0 w-[400px]"
            />
          ) : (
            <div className="flex items-center gap-3 group">
              <h1 className="font-display text-3xl md:text-4xl font-semibold">
                {projectName || 'Visual Editor MVP for Pebble Watchfaces'}
              </h1>
              {projectName && (
                <button
                  onClick={() => setIsEditingName(true)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-black/5 rounded"
                  title="Rename Project"
                >
                  <Pencil size={20} className="text-black/40" />
                </button>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={saveProjectFile}
            className="flex items-center gap-2 border border-black bg-white px-3 py-2 h-auto rounded-none hover:bg-[#f0f0f0]"
          >
            <Save size={16} />
            <span className="text-sm text-black/80 whitespace-nowrap font-semibold">Save (.pfs)</span>
          </Button>
          <div className="flex items-center gap-2 border border-black bg-white px-3 py-2">
            <span className="text-sm text-black/80 whitespace-nowrap">Monochrome preview</span>
            <Switch checked={aplitePreview} onClick={toggleAplite} />
          </div>
          <Button onClick={handleExport} disabled={exporting} size="lg" className="min-w-[140px]">
            <Download size={16} />
            {exporting ? 'Exporting...' : 'Export (zip)'}
          </Button>
        </div>
      </header>

      <main className="grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr_260px] lg:grid-cols-[240px_1fr_280px] xl:grid-cols-[260px_1fr_300px] items-stretch">
        <div className="retro-panel p-4 h-full flex">
          <LayerPanel />
        </div>
        <div className="retro-panel p-3 flex flex-col gap-3 h-full">
          <CanvasStage />
          <Toolbar />
        </div>
        <div className="retro-panel p-4 h-full flex flex-col">
          <PropertiesPanel />
        </div>
      </main>
    </div>
  )
}

export default App
