import { useEffect, useState } from 'react'

const FAMILIES = [
  'Kharon',
  'Kharon Bold',
  'Gotham Black',
  'Gotham Bold',
  'Gotham Medium',
  'Gotham Light',
  'Droid Serif Bold',
  'Droid Serif',
  'Roboto Bold',
  'Roboto Condensed',
  'LECO 1976'
]

export const FontPreloader = () => {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    document.fonts.ready.then(() => {
      setLoaded(true)
    })
  }, [])

  if (loaded) return null

  return (
    <div 
      style={{ 
        position: 'absolute', 
        top: -9999, 
        left: -9999, 
        width: 0, 
        height: 0, 
        overflow: 'hidden', 
        visibility: 'hidden',
        pointerEvents: 'none'
      }}
      aria-hidden="true"
    >
      {FAMILIES.map(font => (
        <span key={font} style={{ fontFamily: font }}>
          Preload {font}
        </span>
      ))}
    </div>
  )
}
