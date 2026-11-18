import type { PriceHistoryPoint } from '../../data/types'
import { QUERY_TTL } from '../../data/ttl'
import { useUexQuery } from '../../data/useUex'
import { formatAuec } from '../../domain/format'
import { historySeries } from '../../domain/history'
import { useI18n } from '../../i18n/i18n'
import { SectionLabel } from '../../ui/components'
import { Sparkline } from '../../ui/Sparkline'

export function HistoryView({ terminalName, points }: { terminalName: string; points: PriceHistoryPoint[] }) {
  const { t, lang } = useI18n()
  const s = historySeries(points)
  const date = (sec: number) => new Date(sec * 1000).toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR')
  const enough = s.buy.length >= 2 || s.sell.length >= 2
  return (
    <div className="history">
      <SectionLabel>{t('history.title', { terminal: terminalName })}</SectionLabel>
      {!enough ? (
        <p className="muted">{t('history.notEnough')}</p>
      ) : (
        <>
          <Sparkline
            series={[
              { values: s.buy, color: 'var(--orange)', label: 'buy' },
              { values: s.sell, color: 'var(--profit)', label: 'sell' },
            ]}
          />
          <div className="history-legend">
            {s.buy.length >= 2 && (
              <span className="legend-buy">
                {t('col.buy')}: {formatAuec(s.buy[0])} → {formatAuec(s.buy[s.buy.length - 1])}
              </span>
            )}
            {s.sell.length >= 2 && (
              <span className="legend-sell">
                {t('col.sell')}: {formatAuec(s.sell[0])} → {formatAuec(s.sell[s.sell.length - 1])}
              </span>
            )}
            <span className="muted">
              {date(s.from)} – {date(s.to)}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

/** Busca o histórico de um par commodity/terminal e mostra o gráfico. */
export function HistoryPanel({ commodityId, terminalId, terminalName }: { commodityId: number; terminalId: number; terminalName: string }) {
  const { t } = useI18n()
  const h = useUexQuery<PriceHistoryPoint[]>(
    'commodities_prices_history',
    { id_commodity: commodityId, id_terminal: terminalId },
    QUERY_TTL.commodities_prices_history,
  )
  if (h.loading && !h.data) return <p className="loading">{t('load.loading')}</p>
  return <HistoryView terminalName={terminalName} points={h.data ?? []} />
}
