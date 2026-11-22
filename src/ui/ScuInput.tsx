import { useEffect, useState } from 'react'

export function ScuInput({ label, value, onChange }: { label: string; value: number; onChange: (scu: number) => void }) {
  const show = (v: number) => (v > 0 ? String(v).replace('.', ',') : '')
  const [text, setText] = useState(show(value))
  const [focused, setFocused] = useState(false)
  useEffect(() => {
    if (!focused) setText(show(value))
  }, [value, focused])
  return (
    <input
      className="input num"
      style={{ width: 100, minWidth: 80 }}
      inputMode="decimal"
      aria-label={label}
      value={text}
      placeholder="SCU"
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        setText(e.target.value)
        const n = Number(e.target.value.trim().replace(',', '.'))
        onChange(Number.isFinite(n) && n > 0 ? n : 0)
      }}
    />
  )
}
