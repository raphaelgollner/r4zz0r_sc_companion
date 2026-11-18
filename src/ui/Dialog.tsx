import { useEffect, useId, useRef, type ReactNode } from 'react'
import { useI18n } from '../i18n/i18n'

/** Janela modal: fecha com Esc, clique fora ou botão Fechar. */
export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const { t } = useI18n()
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // Foca a janela só ao abrir e devolve o foco a quem a abriu ao fechar.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      opener?.focus?.()
    }
  }, [])

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog panel glow" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} ref={ref}>
        <header className="dialog-head">
          <h2 id={titleId}>{title}</h2>
          <button className="btn" onClick={onClose}>
            {t('common.close')}
          </button>
        </header>
        <div className="dialog-body">{children}</div>
      </div>
    </div>
  )
}
