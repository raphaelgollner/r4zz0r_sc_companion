import { formatAuec, formatPercent, formatScu } from '../../domain/format'
import { MARK_KINDS, type MarkKind } from '../../domain/routeMarks'
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
  marks = [],
  onToggleMark,
  legLabel,
  distance,
  dockIds,
}: {
  route: RouteOption
  now: number
  warnHours?: number
  staleDays?: number
  /** Marcações válidas desta rota. */
  marks?: MarkKind[]
  /** Sem isso, o card não mostra o menu Marcar. */
  onToggleMark?: (kind: MarkKind) => void
  /** "1 de 4" no CAMINHO/ROTATIVO. */
  legLabel?: string
  /** Distância compra → venda em Gm (REDUZIR DISTÂNCIAS); undefined = não mostrar. */
  distance?: number | null
  /** Terminais com doca de carga externa, para o selo (só quando a nave precisa da doca). */
  dockIds?: ReadonlySet<number>
}) {
  const { t } = useI18n()
  const fresh = { now, warnHours, staleDays }
  return (
    <article className="route-card">
      <header>
        <h3>
          {legLabel && <span className="leg-label">{legLabel}</span>}
          {r.commodityName}
        </h3>
        <span className="route-profit">
          <span className="num profit">≈ {formatAuec(r.profit)} aUEC</span>
          <span className="muted"> · ROI {formatPercent(r.roi)}</span>
          {typeof distance === 'number' && (
            <span className="route-distance">
              {formatAuec(distance)} Gm · {formatAuec(r.profit / Math.max(distance, 1))} aUEC/Gm
            </span>
          )}
        </span>
      </header>
      {(marks.length > 0 || onToggleMark) && (
        <div className="mark-row">
          {marks.map((m) => (
            <span key={m} className={`mark-tag mark-${m}`}>
              {t(`marks.${m}`)}
            </span>
          ))}
          {onToggleMark && (
            <details className="mark-menu">
              <summary>{t('marks.mark')}</summary>
              <div className="mark-options">
                {MARK_KINDS.map((m) => (
                  <label key={m} className="check">
                    <input type="checkbox" checked={marks.includes(m)} onChange={() => onToggleMark(m)} />
                    {t(`marks.${m}`)}
                  </label>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
      <dl>
        <dt>{t('routes.buy')}</dt>
        <dd>
          <div className="route-stop">
            <TerminalName id={r.buy.id_terminal} fallback={r.buy.terminal_name} />
            {dockIds?.has(r.buy.id_terminal) && <span className="dock-tag">{t('routes.dockTag')}</span>}
          </div>
          <span className="num price">{formatAuec(r.buy.price_buy)}{t('routes.perScu')}</span>
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
          <div className="route-stop">
            <TerminalName id={r.sell.id_terminal} fallback={r.sell.terminal_name} />
            {dockIds?.has(r.sell.id_terminal) && <span className="dock-tag">{t('routes.dockTag')}</span>}
          </div>
          <span className="num price">{formatAuec(r.sell.price_sell)}{t('routes.perScu')}</span>
          {' · '}
          {r.demandKnown ? (
            t('routes.demandLabel', { scu: formatScu(r.sell.scu_sell > 0 ? r.sell.scu_sell : r.sell.scu_sell_avg) })
          ) : (
            <span className="warn">{t('routes.demandUnknown')}</span>
          )}
          {' · '}
          <FreshnessBadge dateModifiedSec={r.sell.date_modified} {...fresh} />
        </dd>

      </dl>
    </article>
  )
}
