import { useState, useRef, useEffect } from 'react'
import { Download, Pencil, Save, Hammer, Terminal, X } from 'lucide-react'
import { Toolbar } from './components/Toolbar'
import { CanvasStage } from './components/CanvasStage'
import { PropertiesPanel } from './components/PropertiesPanel'
import { LayerPanel } from './components/LayerPanel'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { useSceneStore } from './store/scene'
import { generatePebbleProjectZip, saveProjectFile, exportPebbleProject } from './utils/exporter'
import { compileAndDownload } from './lib/buildClient'
import { NewProjectWizard } from './components/NewProjectWizard'
import { FontPreloader } from './components/FontPreloader'
import './index.css'

function App() {
  const { nodes, projectName, setProjectName } = useSceneStore()
  const [isEditingName, setIsEditingName] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Export State
  const [exporting, setExporting] = useState(false)

  // Build State
  const [isCompiling, setIsCompiling] = useState(false)
  const [buildStatus, setBuildStatus] = useState('')
  const [jobId, setJobId] = useState('')
  const [buildLog, setBuildLog] = useState('')
  const [showLog, setShowLog] = useState(false)

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditingName])

  const handleNameBlur = () => {
    setIsEditingName(false)
    if (!projectName.trim()) setProjectName('Untitled Project')
  }

  const handleSourceDownload = async () => {
    try {
      setExporting(true)
      await exportPebbleProject(nodes, projectName || 'pebble-watchface')
    } finally {
      setExporting(false)
    }
  }

  const handleCompile = async () => {
    if (isCompiling) return
    try {
      setIsCompiling(true)
      setBuildStatus('Zipping...')
      setBuildLog('')
      setJobId('')
      
      const { blob, fileName } = await generatePebbleProjectZip(nodes, projectName || 'pebble-watchface')
      
      await compileAndDownload({
        zip: blob,
        zipName: fileName,
        outputName: `${projectName || 'pebble-watchface'}.pbw`,
        // target removed as it causes backend errors (pebble tool doesn't support --target flag)
        onStatus: setBuildStatus,
        onJob: setJobId,
        onLog: (log) => {
          setBuildLog(log)
          // Don't auto-show log on success unless there is an error? 
          // Usually we just let user click the log button.
          // But if it fails, the catch block will alert.
          // Let's just store it.
        }
      })
      
      setBuildStatus('Done')
    } catch (e: any) {
      setBuildStatus('Error')
      alert(e.message) // Show error (including Retry-After)
      if (buildLog) setShowLog(true) // Show log if available on error
    } finally {
      setIsCompiling(false)
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={saveProjectFile}
            className="flex items-center gap-2 border border-black bg-white px-3 py-2 h-auto rounded-none hover:bg-[#f0f0f0]"
          >
            <Save size={16} />
            <span className="text-sm text-black/80 whitespace-nowrap font-semibold">Save (.pfs)</span>
          </Button>
          
          <Button
            onClick={handleSourceDownload}
            disabled={exporting}
            className="flex items-center gap-2 border border-black bg-white text-black hover:bg-[#f0f0f0] rounded-none h-auto py-2 px-3 font-semibold transition-all disabled:opacity-50"
            title="Download Source Code (ZIP)"
          >
            <Download size={16} />
            Source
          </Button>

          <Button 
            onClick={handleCompile} 
            disabled={isCompiling} 
            className="flex items-center gap-2 border border-black bg-[#ff4700] text-white hover:bg-[#cc3900] rounded-none h-auto py-2 px-4 font-bold active:translate-y-[1px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Hammer size={16} />
            {isCompiling ? buildStatus : 'Compile'}
          </Button>

          {buildLog && (
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setShowLog(true)} 
              title="View Build Log"
              className="rounded-none border border-black h-auto py-2 w-10 hover:bg-gray-100"
            >
              <Terminal size={16} />
            </Button>
          )}
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

      {showLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl max-h-[80vh] bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b-2 border-black bg-[#f0f0f0]">
              <div className="flex items-center gap-3">
                <Terminal size={20} />
                <h3 className="font-bold text-lg font-display">Build Log</h3>
                {jobId && <span className="text-xs font-mono bg-black text-white px-2 py-0.5 rounded">{jobId}</span>}
              </div>
              <button 
                onClick={() => setShowLog(false)} 
                className="hover:bg-black/10 p-1 rounded transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-[#1a1a1a] p-4 font-mono text-xs leading-relaxed text-green-400">
              <pre className="whitespace-pre-wrap break-all">{buildLog || 'No output available.'}</pre>
            </div>
            <div className="p-4 border-t-2 border-black flex justify-end gap-2 bg-white">
              <Button onClick={() => setShowLog(false)} variant="outline" className="border-2 border-black rounded-none hover:bg-gray-100">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
