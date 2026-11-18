import { useId, useState, type ReactNode } from 'react'

/**
 * Dica que aparece ao passar o mouse.
 * `focusable` também a mostra pelo teclado (Tab); fica desligado por padrão para não
 * criar dezenas de paradas de Tab nas tabelas.
 */
export function Tooltip({ content, children, focusable = false }: { content: ReactNode; children: ReactNode; focusable?: boolean }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  if (content === null || content === undefined || content === '') return <>{children}</>
  return (
    <span
      className="tip"
      tabIndex={focusable ? 0 : undefined}
      aria-describedby={open ? id : undefined}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          // fecha só a dica, não a janela onde ela está
          e.stopPropagation()
          e.nativeEvent.stopImmediatePropagation()
          setOpen(false)
        }
      }}
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
