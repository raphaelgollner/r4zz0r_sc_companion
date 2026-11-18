import { useMemo, useState } from 'react'

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Campo de busca genérico com lista de opções. */
export function SearchPicker<T>({
  items,
  label,
  value,
  onPick,
  text,
  sub,
  ariaLabel,
  placeholder,
}: {
  items: T[]
  label: (x: T) => string
  value: T | null
  onPick: (x: T) => void
  text: (x: T) => string
  sub?: (x: T) => string | null
  ariaLabel: string
  placeholder?: string
}) {
  const [q, setQ] = useState('')
  const opts = useMemo(() => (q.trim() ? items.filter((x) => norm(text(x)).includes(norm(q.trim()))).slice(0, 12) : []), [items, q, text])
  return (
    <div className="picker">
      <input className="input" role="combobox" aria-label={ariaLabel} aria-expanded={opts.length > 0} placeholder={value ? label(value) : placeholder ?? '…'} value={q} onChange={(e) => setQ(e.target.value)} />
      {opts.length > 0 && (
        <ul className="picker-list" role="listbox">
          {opts.map((x, i) => (
            <li
              key={i}
              role="option"
              aria-selected={x === value}
              onClick={() => {
                onPick(x)
                setQ('')
              }}
            >
              {label(x)} {sub?.(x) && <span className="muted">{sub(x)}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

