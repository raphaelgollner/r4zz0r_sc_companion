import { useCallback, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export function placeTooltip(
  target: DOMRect,
  box: { width: number; height: number },
  viewport: { width: number; height: number },
  gap = 6,
): { top: number; left: number; below: boolean } {
  const below = target.top - box.height - gap < 0
  const top = below ? target.bottom + gap : target.top - box.height - gap
  const left = Math.max(4, Math.min(target.left, viewport.width - box.width - 4))
  return { top, left, below }
}

export function Tooltip({ content, children, focusable = false }: { content: ReactNode; children: ReactNode; focusable?: boolean }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const id = useId()
  const anchor = useRef<HTMLSpanElement>(null)
  const box = useRef<HTMLSpanElement>(null)

  const place = useCallback(() => {
    if (!anchor.current || !box.current) return
    const b = box.current.getBoundingClientRect()
    const p = placeTooltip(anchor.current.getBoundingClientRect(), { width: b.width, height: b.height }, { width: window.innerWidth, height: window.innerHeight })
    setPos({ top: p.top, left: p.left })
  }, [])

  useLayoutEffect(() => {
    if (!open) {
      setPos(null)
      return
    }
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open, place])

  if (content === null || content === undefined || content === '') return <>{children}</>
  return (
    <span
      ref={anchor}
      className="tip"
      tabIndex={focusable ? 0 : undefined}
      aria-describedby={open ? id : undefined}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation()
          e.nativeEvent.stopImmediatePropagation()
          setOpen(false)
        }
      }}
    >
      {children}
      {open &&
        createPortal(
          <span
            ref={box}
            role="tooltip"
            id={id}
            className="tip-box"
            style={pos ? { top: pos.top, left: pos.left } : { top: -9999, left: -9999 }}
          >
            {content}
          </span>,
          document.body,
        )}
    </span>
  )
}
