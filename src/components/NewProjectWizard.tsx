import { useState, useRef } from 'react'
import { Check, Upload } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { useSceneStore, type ProjectFile } from '../store/scene'
import { ALL_TARGET_PLATFORMS } from '../utils/layout'

const PLATFORM_GROUPS = {
  basalt: {
    id: 'basalt',
    label: 'Standard Rect',
    desc: '144 x 168 (Aplite, Basalt, Diorite, Flint)',
    w: 144,
    h: 168,
  },
  chalk: {
    id: 'chalk',
    label: 'Round (Chalk)',
    desc: '180 x 180 (Pebble Time Round)',
    w: 180,
    h: 180,
  },
  gabbro: {
    id: 'gabbro',
    label: 'Round 2 (Gabbro)',
    desc: '260 x 260 (Pebble Round 2)',
    w: 260,
    h: 260,
  },
  emery: {
    id: 'emery',
    label: 'Large Rect (Emery)',
    desc: '200 x 228 (Pebble Time 2)',
    w: 200,
    h: 228,
  },
}

export const NewProjectWizard = () => {
  const { isInitialized, setProjectSettings, loadProject } = useSceneStore()
  const [projectName, setProjectName] = useState('My Watchface')
  const [selectedSize, setSelectedSize] = useState<keyof typeof PLATFORM_GROUPS>('basalt')
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (isInitialized) return null

  const handleCreate = () => {
    const primary = PLATFORM_GROUPS[selectedSize]
    setProjectSettings(primary.w, primary.h, ALL_TARGET_PLATFORMS, projectName)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string) as ProjectFile
        if (json.fileType !== 'pebble-face-studio-project') {
          alert('Invalid project file')
          return
        }
        await loadProject(json)
      } catch (err) {
        console.error(err)
        alert('Failed to parse project file')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="modal-backdrop z-[100] p-4">
      <div
        className="modal-card max-h-[92vh] w-full max-w-2xl overflow-y-auto p-7 md:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-watchface-title"
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="brand-mark brand-mark-small" aria-hidden="true"><span /></div>
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">Pebble Face Studio</span>
            </div>
            <h1 id="new-watchface-title" className="text-2xl font-semibold tracking-tight text-slate-950">New watchface</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={14} className="mr-2" />
            Import .pfs
          </Button>
          <input type="file" accept=".pfs" ref={fileInputRef} className="hidden" onChange={handleImport} />
        </div>
        <p className="mb-7 text-sm text-slate-500">Choose a design base or resume work from a local project file.</p>

        {/* Project Name */}
        <div className="mb-7 space-y-2">
          <Label htmlFor="project-name" className="text-xs font-medium text-slate-600">
            Project Name
          </Label>
          <Input
            id="project-name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="e.g. My Watchface"
            className="h-11 text-base"
          />
        </div>

        {/* 1. Size Selection */}
        <div className="mb-7 grid grid-cols-2 gap-3 md:grid-cols-4">
          {(Object.keys(PLATFORM_GROUPS) as Array<keyof typeof PLATFORM_GROUPS>).map((key) => {
            const group = PLATFORM_GROUPS[key]
            const isSelected = selectedSize === key
            return (
              <button
                key={key}
                onClick={() => setSelectedSize(key)}
                className={`relative flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border p-4 transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-100'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-slate-50'
                }`}
              >
                {isSelected && (
                  <div className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-indigo-600 text-white">
                    <Check size={16} strokeWidth={3} />
                  </div>
                )}
                {key === 'chalk' || key === 'gabbro' ? (
                  <div
                    className="rounded-full border-2 border-current opacity-80"
                    style={{ width: group.w / 4, height: group.h / 4 }}
                  />
                ) : (
                  <div
                    className="border-2 border-current opacity-80 rounded-none"
                    style={{ width: group.w / 4, height: group.h / 4 }}
                  />
                )}
                <div className="text-center">
                  <div className={`text-sm font-semibold ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>
                    {group.label}
                  </div>
                  <div className={`mt-1 text-[10px] leading-relaxed ${isSelected ? 'text-indigo-500' : 'text-slate-400'}`}>{group.desc}</div>
                </div>
              </button>
            )
          })}
        </div>

        <Button onClick={handleCreate} size="lg" className="h-11 w-full">
          Create Project
        </Button>
      </div>
    </div>
  )
}
