import { useId, useState, type ReactNode } from 'react'

/** Dica que aparece ao passar o mouse ou focar pelo teclado. */
export function Tooltip({ content, children }: { content: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  if (content === null || content === undefined || content === '') return <>{children}</>
  return (
    <span
      className="tip"
      tabIndex={0}
      aria-describedby={open ? id : undefined}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
    >
      {children}
      {open && (
        <span role="tooltip" id={id} className="tip-box">
          {content}
        </span>
      )}
    </span>
  )
}
