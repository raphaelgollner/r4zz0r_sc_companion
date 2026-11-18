import { formatAuec, formatPercent, formatScu } from '../../domain/format'
import type { RouteOption } from '../../domain/routes'
import { useI18n } from '../../i18n/i18n'
import { FreshnessBadge } from '../../ui/components'
import { TerminalName } from '../../ui/TerminalName'
import { Tooltip } from '../../ui/Tooltip'

export function RouteCard({
  route: r,
  now,
  warnHours,
  staleDays,
}: {
  route: RouteOption
  now: number
  warnHours?: number
  staleDays?: number
}) {
  const { t } = useI18n()
  const fresh = { now, warnHours, staleDays }
  return (
    <article className="route-card">
      <header>
        <h3>{r.commodityName}</h3>
        <span className="route-path">
          <TerminalName id={r.buy.id_terminal} fallback={r.buy.terminal_name} /> <span className="arrow">→</span>{' '}
          <TerminalName id={r.sell.id_terminal} fallback={r.sell.terminal_name} />
        </span>
      </header>
      <dl>
        <dt>{t('routes.buy')}</dt>
        <dd>
          <span className="num">{formatAuec(r.buy.price_buy)}{t('routes.perScu')}</span>
          {' · '}
          {r.stockKnown ? (
            t('routes.stockLabel', { scu: formatScu(r.buy.scu_buy > 0 ? r.buy.scu_buy : r.buy.scu_buy_avg) })
          ) : (
            <span className="warn">{t('routes.stockUnknown')}</span>
          )}
          {' · '}
          <FreshnessBadge dateModifiedSec={r.buy.date_modified} {...fresh} />
        </dd>

        <dt>{t('routes.load')}</dt>
        <dd>
          <span className="num">{formatScu(r.qty)}</span>{' '}
          <Tooltip content={t(`routes.limitWhy.${r.limitedBy}`)}>
            <span className="limit">({t('routes.limit', { what: t(`routes.limit.${r.limitedBy}`) })})</span>
          </Tooltip>
          {' = '}
          <span className="num">{formatAuec(r.cost)} aUEC</span>
        </dd>

        <dt>{t('routes.sell')}</dt>
        <dd>
          <span className="num">{formatAuec(r.sell.price_sell)}{t('routes.perScu')}</span>
          {' · '}
          {r.demandKnown ? (
            t('routes.demandLabel', { scu: formatScu(r.sell.scu_sell > 0 ? r.sell.scu_sell : r.sell.scu_sell_avg) })
          ) : (
            <span className="warn">{t('routes.demandUnknown')}</span>
          )}
          {' · '}
          <FreshnessBadge dateModifiedSec={r.sell.date_modified} {...fresh} />
        </dd>

        <dt>{t('routes.profit')}</dt>
        <dd className="profit-line">
          <span className="num profit">≈ {formatAuec(r.profit)} aUEC</span>
          <span className="muted"> · ROI {formatPercent(r.roi)}</span>
        </dd>
      </dl>
    </article>
  )
}
