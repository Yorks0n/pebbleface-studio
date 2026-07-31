import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  Download,
  FolderOpen,
  Hammer,
  Pencil,
  Plus,
  Save,
  Terminal,
  X,
} from 'lucide-react'
import { Toolbar } from './components/Toolbar'
import { CanvasStage } from './components/CanvasStage'
import { PropertiesPanel } from './components/PropertiesPanel'
import { LayerPanel } from './components/LayerPanel'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { useSceneStore, type ProjectFile } from './store/scene'
import { generatePebbleProjectZip, saveProjectFile, exportPebbleProject } from './utils/exporter'
import { compileAndDownload } from './lib/buildClient'
import { NewProjectWizard } from './components/NewProjectWizard'
import { FontPreloader } from './components/FontPreloader'
import './index.css'

function App() {
  const {
    nodes,
    projectName,
    setProjectName,
    stage,
    previewStage,
    aplitePreview,
    selectedIds,
    loadProject,
  } = useSceneStore()
  const [isEditingName, setIsEditingName] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const projectInputRef = useRef<HTMLInputElement>(null)

  const [exporting, setExporting] = useState(false)
  const [isCompiling, setIsCompiling] = useState(false)
  const [buildStatus, setBuildStatus] = useState('')
  const [jobId, setJobId] = useState('')
  const [buildLog, setBuildLog] = useState('')
  const [showLog, setShowLog] = useState(false)

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedIds[0]),
    [nodes, selectedIds],
  )
  const activeStage = previewStage ?? stage

  useEffect(() => {
    if (isEditingName && inputRef.current) inputRef.current.focus()
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
      setBuildStatus('Preparing…')
      setBuildLog('')
      setJobId('')

      const { blob, fileName } = await generatePebbleProjectZip(nodes, projectName || 'pebble-watchface')

      await compileAndDownload({
        zip: blob,
        zipName: fileName,
        outputName: `${projectName || 'pebble-watchface'}.pbw`,
        onStatus: setBuildStatus,
        onJob: setJobId,
        onLog: setBuildLog,
      })

      setBuildStatus('Done')
    } catch (e: unknown) {
      setBuildStatus('Error')
      alert(e instanceof Error ? e.message : String(e))
      if (buildLog) setShowLog(true)
    } finally {
      setIsCompiling(false)
    }
  }

  const handleProjectImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (readerEvent) => {
      try {
        const project = JSON.parse(readerEvent.target?.result as string) as ProjectFile
        if (project.fileType !== 'pebble-face-studio-project') {
          alert('Invalid project file')
          return
        }
        await loadProject(project)
      } catch (error) {
        console.error(error)
        alert('Failed to parse project file')
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  const handleNewProject = () => {
    if (nodes.length > 0 && !window.confirm('Start a new project? Unsaved changes in this workspace will be lost.')) {
      return
    }
    window.location.reload()
  }

  return (
    <div className="studio-shell">
      <FontPreloader />
      <NewProjectWizard />

      <header className="studio-topbar">
        <div className="flex min-w-0 items-center gap-3">
          <div className="brand-mark" aria-hidden="true">
            <span />
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-sm font-semibold tracking-tight text-slate-950">Pebble Face Studio</span>
            <span className="version-badge">Beta</span>
          </div>
          <div className="hidden h-6 w-px bg-slate-200 md:block" />
          <div className="group hidden min-w-0 items-center gap-1.5 sm:flex">
            {isEditingName ? (
              <Input
                ref={inputRef}
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                onBlur={handleNameBlur}
                onKeyDown={(event) => event.key === 'Enter' && setIsEditingName(false)}
                className="h-8 w-48 border-transparent bg-slate-50 px-2 font-semibold"
              />
            ) : (
              <>
                <span className="max-w-52 truncate text-sm font-semibold text-slate-800">
                  {projectName || 'Untitled Project'}
                </span>
                {projectName && (
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="rounded-md p-1 text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100 focus:opacity-100"
                    aria-label="Rename project"
                    title="Rename project"
                  >
                    <Pencil size={13} />
                  </button>
                )}
              </>
            )}
          </div>
          <span className="hidden items-center gap-1 text-xs font-medium text-emerald-600 lg:flex">
            <Check size={13} />
            Local workspace
          </span>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={handleNewProject}>
            <Plus size={15} />
            <span className="hidden sm:inline">New</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => projectInputRef.current?.click()}>
            <FolderOpen size={15} />
            <span className="hidden sm:inline">Open .pfs</span>
          </Button>
          <Button variant="outline" size="sm" onClick={saveProjectFile}>
            <Save size={15} />
            <span className="hidden sm:inline">Save</span>
          </Button>
          <input
            ref={projectInputRef}
            type="file"
            accept=".pfs"
            className="hidden"
            onChange={handleProjectImport}
          />
        </div>
      </header>

      <div className="studio-commandbar">
        <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
          <span className="meta-pill meta-pill-primary">
            Design base: {stage.width}×{stage.height}
          </span>
          <span className="meta-pill hidden md:inline-flex">
            Build targets: All Pebble models
          </span>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {buildLog && (
            <Button variant="ghost" size="sm" onClick={() => setShowLog(true)} title="View build log">
              <Terminal size={15} />
              <span className="hidden md:inline">Log</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSourceDownload}
            disabled={exporting}
            title="Download Pebble source project"
          >
            <Download size={15} />
            <span className="hidden md:inline">{exporting ? 'Exporting…' : 'Source'}</span>
          </Button>
          <Button size="sm" onClick={handleCompile} disabled={isCompiling} className="bg-indigo-600 hover:bg-indigo-700">
            <Hammer size={15} />
            {isCompiling ? buildStatus : 'Build & Export'}
          </Button>
        </div>
      </div>

      <main className="studio-workspace">
        <aside className="studio-panel studio-panel-left">
          <LayerPanel />
        </aside>

        <section className="studio-center">
          <Toolbar />
          <div className="studio-canvas-viewport">
            <CanvasStage />
          </div>
          <div className="studio-previewbar">
            <div>
              <span className="previewbar-label">Preview size</span>
              <span className="previewbar-value">{activeStage.width}×{activeStage.height}</span>
            </div>
            <div>
              <span className="previewbar-label">Color mode</span>
              <span className="previewbar-value">{aplitePreview ? 'Aplite mono' : 'Color'}</span>
            </div>
            <div className="hidden sm:block">
              <span className="previewbar-label">Mapping</span>
              <span className="previewbar-value">Position only</span>
            </div>
            <div className="ml-auto hidden items-center gap-2 text-xs text-slate-500 md:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Preview ready
            </div>
          </div>
        </section>

        <aside className="studio-panel studio-panel-right">
          <div className="inspector-heading">
            <span className="text-xs font-medium text-indigo-600">
              {selectedNode ? 'Selection' : 'Document'}
            </span>
            <span className="min-w-0 truncate text-sm font-semibold text-slate-800">
              {selectedNode?.name || projectName || 'Project settings'}
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <PropertiesPanel />
          </div>
        </aside>
      </main>

      <footer className="studio-statusbar">
        <div>
          <span className="status-label">Selection</span>
          <span>{selectedNode?.name || 'None'}</span>
        </div>
        <div>
          <span className="status-label">Scene elements</span>
          <span>{nodes.length}</span>
        </div>
        <div className="hidden sm:flex">
          <span className="status-label">Preview device</span>
          <span>{activeStage.width}×{activeStage.height}</span>
        </div>
        <div className="ml-auto text-emerald-600">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Ready
        </div>
      </footer>

      {showLog && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="build-log-title">
          <div className="modal-card flex max-h-[80vh] w-full max-w-3xl flex-col">
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <Terminal size={18} />
                <h3 id="build-log-title" className="text-base font-semibold">Build log</h3>
                {jobId && <span className="rounded bg-slate-900 px-2 py-0.5 font-mono text-[10px] text-white">{jobId}</span>}
              </div>
              <button
                onClick={() => setShowLog(false)}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close build log"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-slate-950 p-4 font-mono text-xs leading-relaxed text-emerald-300">
              <pre className="whitespace-pre-wrap break-all">{buildLog || 'No output available.'}</pre>
            </div>
            <div className="flex justify-end border-t border-slate-200 p-3">
              <Button onClick={() => setShowLog(false)} variant="outline" size="sm">Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
