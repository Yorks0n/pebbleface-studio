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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/90 backdrop-blur-none">
      <div className="w-full max-w-2xl bg-white border border-black p-8 shadow-none animate-in fade-in zoom-in-95 duration-200 retro-panel">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-black font-display">New Watchface</h1>
          <Button
            variant="outline"
            size="sm"
            className="rounded-none border-2 border-black font-semibold hover:bg-black hover:text-white"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={14} className="mr-2" />
            Import .pfs
          </Button>
          <input type="file" accept=".pfs" ref={fileInputRef} className="hidden" onChange={handleImport} />
        </div>
        <p className="text-black/50 mb-8">Set up your new Pebble project or resume work.</p>

        {/* Project Name */}
        <div className="mb-8 space-y-2">
          <Label htmlFor="project-name" className="text-sm font-semibold uppercase tracking-wider text-black/70">
            Project Name
          </Label>
          <Input
            id="project-name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="e.g. My Watchface"
            className="rounded-none border-2 border-black focus-visible:ring-0 text-lg h-12"
          />
        </div>

        {/* 1. Size Selection */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {(Object.keys(PLATFORM_GROUPS) as Array<keyof typeof PLATFORM_GROUPS>).map((key) => {
            const group = PLATFORM_GROUPS[key]
            const isSelected = selectedSize === key
            return (
              <button
                key={key}
                onClick={() => setSelectedSize(key)}
                className={`relative flex flex-col items-center justify-center gap-3 p-6 border-2 transition-all ${
                  isSelected
                    ? 'border-black bg-black text-white'
                    : 'border-[#ccc] bg-white text-black hover:border-black hover:bg-[#f0f0f0]'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 text-white">
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
                  <div className={`font-semibold ${isSelected ? 'text-white' : 'text-black/70'}`}>
                    {group.label}
                  </div>
                  <div className={`text-xs mt-1 ${isSelected ? 'text-white/60' : 'text-black/40'}`}>{group.desc}</div>
                </div>
              </button>
            )
          })}
        </div>

        <Button onClick={handleCreate} size="lg" className="w-full h-12 text-lg rounded-none border-2 border-black bg-black text-white hover:bg-white hover:text-black hover:border-black">
          Create Project
        </Button>
      </div>
    </div>
  )
}
