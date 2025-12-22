import { useState } from 'react'
import { Check, Monitor, Watch } from 'lucide-react'
import { Button } from './ui/button'
import { useSceneStore } from '../store/scene'

const PLATFORM_GROUPS = {
  basalt: {
    id: 'basalt',
    label: 'Standard Rect',
    desc: '144 x 168 (Aplite, Basalt, Diorite, Flint)',
    platforms: ['aplite', 'basalt', 'diorite', 'flint'],
    w: 144,
    h: 168,
  },
  chalk: {
    id: 'chalk',
    label: 'Round (Chalk)',
    desc: '180 x 180 (Pebble Time Round)',
    platforms: ['chalk'],
    w: 180,
    h: 180,
  },
  emery: {
    id: 'emery',
    label: 'Large Rect (Emery)',
    desc: '200 x 228 (Pebble Time 2)',
    platforms: ['emery'],
    w: 200,
    h: 228,
  },
}

export const NewProjectWizard = () => {
  const { isInitialized, setProjectSettings } = useSceneStore()
  const [selectedSize, setSelectedSize] = useState<keyof typeof PLATFORM_GROUPS>('basalt')
  const [addEmery, setAddEmery] = useState(false) // When Basalt is selected
  const [addBasalt, setAddBasalt] = useState(false) // When Emery is selected

  if (isInitialized) return null

  const handleCreate = () => {
    const primary = PLATFORM_GROUPS[selectedSize]
    let platforms = [...primary.platforms]
    
    // Logic for compatibility
    if (selectedSize === 'basalt' && addEmery) {
      platforms.push('emery')
    } else if (selectedSize === 'emery' && addBasalt) {
      platforms = [...platforms, ...PLATFORM_GROUPS.basalt.platforms]
    }

    setProjectSettings(primary.w, primary.h, platforms)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md">
      <div className="w-full max-w-2xl bg-[#1e1e1e] border border-white/10 rounded-2xl p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <h1 className="text-3xl font-bold text-white mb-2">New Watchface</h1>
        <p className="text-white/50 mb-8">Select the target platform size for your project.</p>

        {/* 1. Size Selection */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {(Object.keys(PLATFORM_GROUPS) as Array<keyof typeof PLATFORM_GROUPS>).map((key) => {
            const group = PLATFORM_GROUPS[key]
            const isSelected = selectedSize === key
            return (
              <button
                key={key}
                onClick={() => {
                  setSelectedSize(key)
                  setAddEmery(false)
                  setAddBasalt(false)
                }}
                className={`relative flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-[#00f1ff] bg-[#00f1ff]/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 text-[#00f1ff]">
                    <Check size={16} strokeWidth={3} />
                  </div>
                )}
                {key === 'chalk' ? (
                  <div className="w-12 h-12 rounded-full border-2 border-current opacity-80" />
                ) : (
                  <div
                    className="border-2 border-current opacity-80 rounded-sm"
                    style={{ width: group.w / 4, height: group.h / 4 }}
                  />
                )}
                <div className="text-center">
                  <div className={`font-semibold ${isSelected ? 'text-white' : 'text-white/70'}`}>
                    {group.label}
                  </div>
                  <div className="text-xs text-white/40 mt-1">{group.desc}</div>
                </div>
              </button>
            )
          })}
        </div>

        {/* 2. Compatibility Options */}
        <div className="mb-8 p-4 bg-black/20 rounded-lg border border-white/5 min-h-[80px]">
          <h3 className="text-sm font-semibold text-white/80 mb-3 uppercase tracking-wider">
            Compatibility
          </h3>
          
          {selectedSize === 'chalk' && (
            <p className="text-sm text-white/40 italic">
              Pebble Time Round (Chalk) projects are exclusive and cannot share a codebase with rectangular watches due to layout differences.
            </p>
          )}

          {selectedSize === 'basalt' && (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="add-emery"
                checked={addEmery}
                onChange={(e) => setAddEmery(e.target.checked)}
                className="w-4 h-4 rounded border-white/30 bg-black/50 accent-[#00f1ff]"
              />
              <label htmlFor="add-emery" className="text-sm text-white/70 cursor-pointer select-none">
                Also compatible with <strong className="text-white">Emery (Pebble Time 2)</strong>?
                <span className="block text-xs text-white/40 mt-0.5">
                  Canvas will remain 144x168. Emery will center the face or upscale.
                </span>
              </label>
            </div>
          )}

           {selectedSize === 'emery' && (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="add-basalt"
                checked={addBasalt}
                onChange={(e) => setAddBasalt(e.target.checked)}
                className="w-4 h-4 rounded border-white/30 bg-black/50 accent-[#00f1ff]"
              />
              <label htmlFor="add-basalt" className="text-sm text-white/70 cursor-pointer select-none">
                Also compatible with <strong className="text-white">Standard Rect (144x168)</strong>?
                <span className="block text-xs text-white/40 mt-0.5">
                  Warning: Design might be cropped on smaller screens.
                </span>
              </label>
            </div>
          )}
        </div>

        <Button onClick={handleCreate} size="lg" className="w-full h-12 text-lg">
          Create Project
        </Button>
      </div>
    </div>
  )
}
