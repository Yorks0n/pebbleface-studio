import { useEffect, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import {
  formatPreviewTime,
  PREVIEW_TIME_SPEEDS,
  previewMinutesOfDay,
  previewTimeAt,
} from '../lib/preview-clock'
import { useSceneStore } from '../store/scene'
import { Button } from './ui/button'

export const PreviewTimeControls = () => {
  const {
    previewTimeAnchorMs,
    previewTimeAnchorRealMs,
    previewTimeSpeed,
    setPreviewTimeMinutes,
    setPreviewTimeSpeed,
    resetPreviewTime,
  } = useSceneStore()
  const [now, setNow] = useState(() => new Date(previewTimeAt({
    previewTimeAnchorMs,
    previewTimeAnchorRealMs,
    previewTimeSpeed,
  })))

  useEffect(() => {
    const update = () => setNow(new Date(previewTimeAt({
      previewTimeAnchorMs,
      previewTimeAnchorRealMs,
      previewTimeSpeed,
    })))
    update()
    const timer = window.setInterval(update, 250)
    return () => window.clearInterval(timer)
  }, [previewTimeAnchorMs, previewTimeAnchorRealMs, previewTimeSpeed])

  const minutes = previewMinutesOfDay(now)

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <output className="font-mono text-lg font-semibold tabular-nums tracking-tight text-slate-800">
          {formatPreviewTime(now)}
        </output>
        <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600">
          {previewTimeSpeed}×
        </span>
      </div>

      <div>
        <input
          type="range"
          min={0}
          max={24 * 60 - 1}
          step={1}
          value={minutes}
          onChange={(event) => setPreviewTimeMinutes(Number(event.target.value))}
          className="preview-time-slider"
          aria-label="Preview time of day"
          aria-valuetext={formatPreviewTime(now)}
        />
        <div className="mt-1 flex justify-between text-[9px] font-medium tabular-nums text-slate-400" aria-hidden="true">
          <span>00:00</span>
          <span>12:00</span>
          <span>24:00</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {PREVIEW_TIME_SPEEDS.map((speed) => (
          <Button
            key={speed}
            type="button"
            size="sm"
            variant={previewTimeSpeed === speed ? 'default' : 'outline'}
            className="h-7 min-w-0 flex-1 px-1 text-[10px]"
            onClick={() => setPreviewTimeSpeed(speed)}
            aria-pressed={previewTimeSpeed === speed}
          >
            {speed}×
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-1.5 text-[10px]"
          onClick={resetPreviewTime}
          title="Reset to the current time"
        >
          <RotateCcw size={11} />
          Reset
        </Button>
      </div>
    </div>
  )
}
