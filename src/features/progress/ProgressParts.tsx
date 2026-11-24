import type { ReactNode } from 'react'
import { commoditySummary, placesVisited, sessionSummary, type Session, type Tx } from '../../domain/progress'
import { formatAuec, formatScu } from '../../domain/format'
import { formatDuration, signed, useDateFmt } from './progressFormat'
import { useI18n } from '../../i18n/i18n'
import { DataTable, Panel, SectionLabel } from '../../ui/components'

export function SessionsPanel({ sessions, txs, now, selected, onSelect }: { sessions: Session[]; txs: Tx[]; now: number; selected: string; onSelect: (id: string) => void }) {
  const { t } = useI18n()
  const dateFmt = useDateFmt()
  return (
    <div role="region" aria-label={t('progress.sessions')}>
      <Panel>
        <SectionLabel>{t('progress.sessions')}</SectionLabel>
        <DataTable<Session>
          rows={sessions}
          rowKey={(s) => s.id}
          empty={t('progress.noSessions')}
          selectedKey={selected}
          onRowClick={(s) => onSelect(s.id)}
          columns={[
            { key: 'd', header: t('progress.colDate'), render: (s) => dateFmt(s.startedAt) },
            { key: 'dur', header: t('progress.duration'), render: (s) => (s.endedAt ? formatDuration(s.endedAt - s.startedAt) : `● ${formatDuration(now - s.startedAt)}`) },
            { key: 'in', header: t('progress.income'), align: 'right', render: (s) => formatAuec(sessionSummary(s, txs, now).income) },
            { key: 'out', header: t('progress.expense'), align: 'right', render: (s) => formatAuec(sessionSummary(s, txs, now).expense) },
            {
              key: 'net',
              header: t('progress.net'),
              align: 'right',
              render: (s) => {
                const net = sessionSummary(s, txs, now).net
                return <span className={net >= 0 ? 'profit' : 'loss'}>{signed(net)}</span>
              },
            },
          ]}
        />
      </Panel>
    </div>
  )
}

export function SummaryPanel({ session, txs }: { session: Session; txs: Tx[] }) {
  const { t } = useI18n()
  const dateFmt = useDateFmt()
  const own = txs.filter((x) => x.sessionId === session.id)
  const byCommodity = commoditySummary(own)
  const places = placesVisited(own)
  return (
    <div role="region" aria-label={t('progress.summary')}>
      <Panel>
        <SectionLabel>
          {t('progress.summary')} · {dateFmt(session.startedAt)}
        </SectionLabel>
        {byCommodity.length === 0 && places.length === 0 ? (
          <p className="muted">{t('progress.summaryEmpty')}</p>
        ) : (
          <div className="grid-2">
            <DataTable
              rows={byCommodity}
              rowKey={(c) => c.commodityId}
              empty={t('progress.summaryEmpty')}
              columns={[
                { key: 'n', header: t('progress.resource'), render: (c) => c.name },
                { key: 'b', header: t('progress.bought'), align: 'right', render: (c) => formatScu(c.boughtScu) },
                { key: 's', header: t('progress.sold'), align: 'right', render: (c) => formatScu(c.soldScu) },
                { key: 'net', header: t('progress.net'), align: 'right', render: (c) => <span className={c.net >= 0 ? 'profit' : 'loss'}>{signed(c.net)}</span> },
              ]}
            />
            <DataTable
              rows={places}
              rowKey={(p) => p.terminalId}
              empty={t('progress.summaryEmpty')}
              columns={[
                { key: 'p', header: t('progress.visited'), render: (p) => p.name },
                {
                  key: 'a',
                  header: t('progress.didThere'),
                  render: (p) =>
                    p.actions.length ? p.actions.map((a) => t(a.kind === 'buy' ? 'progress.boughtX' : 'progress.soldX', { name: a.commodity })).join(' · ') : '—',
                },
              ]}
            />
          </div>
        )}
      </Panel>
    </div>
  )
}

export function TxTable({ txs, describe, actions }: { txs: Tx[]; describe: (x: Tx) => string; actions?: (x: Tx) => ReactNode }) {
  const { t } = useI18n()
  const dateFmt = useDateFmt()
  return (
    <DataTable<Tx>
      rows={txs}
      rowKey={(x) => x.id}
      empty={t('progress.noTxs')}
      columns={[
        { key: 'at', header: t('progress.colDate'), render: (x) => dateFmt(x.at) },
        { key: 'desc', header: t('progress.description'), render: (x) => describe(x) },
        {
          key: 'res',
          header: t('progress.resource'),
          render: (x) => (x.commodityName ? (x.scu ? `${x.commodityName} · ${formatScu(x.scu)}` : x.commodityName) : '—'),
        },
        { key: 'place', header: t('progress.place'), render: (x) => x.terminalName ?? '—' },
        { key: 'cat', header: t('progress.category'), render: (x) => (x.kind === 'adjust' ? '—' : <span className="chip">{t(`cat.${x.category}`)}</span>) },
        { key: 'val', header: t('progress.value'), align: 'right', render: (x) => <span className={x.amount >= 0 ? 'profit' : 'loss'}>{signed(x.amount)}</span> },
        ...(actions ? [{ key: 'act', header: '', render: actions }] : []),
      ]}
    />
  )
}
