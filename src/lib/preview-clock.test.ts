import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  dateAtPreviewMinutes,
  previewMinutesOfDay,
  previewTimeAt,
} from './preview-clock'
import { useSceneStore } from '../store/scene'

afterEach(() => {
  vi.useRealTimers()
  useSceneStore.getState().resetPreviewTime()
})

describe('preview clock', () => {
  it('advances from its anchor at the selected speed', () => {
    expect(previewTimeAt({
      previewTimeAnchorMs: 1_000,
      previewTimeAnchorRealMs: 500,
      previewTimeSpeed: 50,
    }, 1_500)).toBe(51_000)
  })

  it('sets the time of day without changing the date', () => {
    const source = new Date(2026, 7, 17, 9, 42, 31, 123)
    const result = dateAtPreviewMinutes(source, 14 * 60 + 5)

    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(7)
    expect(result.getDate()).toBe(17)
    expect(result.getHours()).toBe(14)
    expect(result.getMinutes()).toBe(5)
    expect(result.getSeconds()).toBe(0)
  })

  it('clamps slider values to the final minute of the day', () => {
    const result = dateAtPreviewMinutes(new Date(2026, 7, 17), 24 * 60)
    expect(previewMinutesOfDay(result)).toBe(24 * 60 - 1)
  })

  it('updates the shared preview clock when the slider changes', () => {
    vi.useFakeTimers()
    const realNow = new Date(2026, 7, 17, 9, 42, 31).getTime()
    vi.setSystemTime(realNow)
    useSceneStore.setState({
      previewTimeAnchorMs: realNow,
      previewTimeAnchorRealMs: realNow,
      previewTimeSpeed: 1,
    })

    useSceneStore.getState().setPreviewTimeMinutes(13 * 60 + 15)

    const state = useSceneStore.getState()
    const previewDate = new Date(previewTimeAt(state, Date.now()))
    expect(previewDate.getHours()).toBe(13)
    expect(previewDate.getMinutes()).toBe(15)
    expect(previewDate.getSeconds()).toBe(0)
  })
})
