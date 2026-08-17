export const PREVIEW_TIME_SPEEDS = [1, 5, 10, 50] as const

export type PreviewTimeSpeed = (typeof PREVIEW_TIME_SPEEDS)[number]

export type PreviewClock = {
  previewTimeAnchorMs: number
  previewTimeAnchorRealMs: number
  previewTimeSpeed: PreviewTimeSpeed
}

export const previewTimeAt = (clock: PreviewClock, realNowMs = Date.now()) =>
  clock.previewTimeAnchorMs +
  (realNowMs - clock.previewTimeAnchorRealMs) * clock.previewTimeSpeed

export const previewMinutesOfDay = (date: Date) =>
  date.getHours() * 60 + date.getMinutes()

export const dateAtPreviewMinutes = (date: Date, minutes: number) => {
  const clampedMinutes = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutes)))
  const result = new Date(date)
  result.setHours(Math.floor(clampedMinutes / 60), clampedMinutes % 60, 0, 0)
  return result
}

export const formatPreviewTime = (date: Date) =>
  new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)
