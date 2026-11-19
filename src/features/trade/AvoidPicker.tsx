import { useMemo } from 'react'
import type { Terminal } from '../../data/types'
import { avoidKey, avoidLabel, avoidOptions, type AvoidEntry } from '../../domain/avoid'
import { useI18n } from '../../i18n/i18n'
import { SearchPicker } from '../../ui/SearchPicker'

/** Lugares fora das rotas: busca para adicionar e etiquetas com × para remover. */
export function AvoidPicker({ terminals, value, onChange }: { terminals: Terminal[]; value: AvoidEntry[]; onChange: (v: AvoidEntry[]) => void }) {
  const { t } = useI18n()
  const chosen = useMemo(() => new Set(value.map(avoidKey)), [value])
  const options = useMemo(() => avoidOptions(terminals).filter((e) => !chosen.has(avoidKey(e))), [terminals, chosen])
  const sub = (e: AvoidEntry) =>
    e.place ? `${e.planet} · ${e.system}` : e.planet ? `${t('routes.avoidPlanet')} · ${e.system}` : t('routes.avoidSystem')

  return (
    <div className="field avoid">
      <span>{t('routes.avoid')}</span>
      <div className="avoid-row">
        {value.map((e) => (
          <span key={avoidKey(e)} className="avoid-tag" title={sub(e)}>
            {avoidLabel(e)}
            <button
              type="button"
              aria-label={t('routes.avoidRemove', { name: avoidLabel(e) })}
              onClick={() => onChange(value.filter((x) => avoidKey(x) !== avoidKey(e)))}
            >
              ×
            </button>
          </span>
        ))}
        <SearchPicker
          items={options}
          label={avoidLabel}
          text={(e) => `${avoidLabel(e)} ${e.planet ?? ''} ${e.system}`}
          sub={sub}
          value={null}
          onPick={(e) => onChange([...value, e])}
          ariaLabel={t('routes.avoid')}
          placeholder={t('routes.avoidAdd')}
        />
      </div>
    </div>
  )
}
