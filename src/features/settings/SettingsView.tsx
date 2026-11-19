import { useState } from 'react'
import { formatAge } from '../../domain/freshness'
import { useI18n, type Lang } from '../../i18n/i18n'
import { usePrefs } from '../../store/prefs'
import { DataTable, Panel, SectionLabel } from '../../ui/components'

export interface CacheInfo {
  resource: string
  fetchedAt: number | null
}

export function SettingsView({
  version,
  onClearCache,
  cache,
  refreshing = false,
  onRefreshAll,
}: {
  version: string
  onClearCache: () => Promise<void>
  /** Idade de cada recurso do UEX; sem isso, o painel "Dados salvos" não aparece. */
  cache?: CacheInfo[]
  refreshing?: boolean
  onRefreshAll?: () => void
}) {
  const { t, lang, setLang } = useI18n()
  const [prefs, setPrefs] = usePrefs()
  const [cleared, setCleared] = useState<'ok' | 'failed' | null>(null)

  const num = (v: string, fallback: number) => {
    const n = Number(v)
    return Number.isFinite(n) && n > 0 ? n : fallback
  }

  return (
    <div className="settings-grid">
    <div className="stack">
      <Panel title={t('settings.title')} glow>
        <SectionLabel>{t('settings.language')}</SectionLabel>
        <label className="field">
          {t('settings.language')}
          <select className="select" value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
            <option value="pt">Português (BR)</option>
            <option value="en">English</option>
          </select>
        </label>
      </Panel>

      <Panel>
        <SectionLabel>{t('settings.freshness')}</SectionLabel>
        <div className="row">
          <label className="field">
            {t('settings.warnHours')}
            <input
              className="input num"
              type="number"
              min={1}
              defaultValue={prefs.warnHours}
              onChange={(e) => setPrefs({ warnHours: num(e.target.value, prefs.warnHours) })}
            />
          </label>
          <label className="field">
            {t('settings.staleDays')}
            <input
              className="input num"
              type="number"
              min={1}
              defaultValue={prefs.staleDays}
              onChange={(e) => setPrefs({ staleDays: num(e.target.value, prefs.staleDays) })}
            />
          </label>
        </div>
      </Panel>

      <Panel>
        <SectionLabel>{t('settings.cache')}</SectionLabel>
        <div className="row" style={{ alignItems: 'center' }}>
          <button
            className="btn"
            onClick={async () => {
              try {
                await onClearCache()
                setCleared('ok')
              } catch {
                setCleared('failed')
              }
            }}
          >
            {t('settings.clearCache')}
          </button>
          {cleared === 'ok' && <span className="profit">{t('settings.cacheCleared')}</span>}
          {cleared === 'failed' && <span className="loss">{t('settings.cacheClearFailed')}</span>}
        </div>
      </Panel>

      <Panel>
        <SectionLabel>{t('settings.about')}</SectionLabel>
        <p>{t('settings.version', { version })}</p>
        <p>{t('settings.source')}</p>
        <p className="muted">{t('footer.disclaimer')}</p>
      </Panel>
    </div>

    {cache && (
      <Panel>
        <SectionLabel>{t('home.cache')}</SectionLabel>
        <DataTable
          rows={cache}
          rowKey={(c) => c.resource}
          columns={[
            { key: 'r', header: 'UEX', render: (c) => <code>{c.resource}</code> },
            {
              key: 'age',
              header: t('common.updated'),
              render: (c) => (c.fetchedAt ? formatAge(c.fetchedAt / 1000, Date.now(), lang) : <span className="muted">{t('home.never')}</span>),
            },
          ]}
        />
        <div style={{ marginTop: 14 }}>
          <button className="btn" onClick={onRefreshAll} disabled={refreshing}>
            {t('home.refreshAll')}
          </button>
        </div>
      </Panel>
    )}
    </div>
  )
}
