import { useTerminal } from '../../data/terminals'
import type { Item, ItemPrice } from '../../data/types'
import { formatAuec } from '../../domain/format'
import { locationPath } from '../../domain/location'
import { useI18n } from '../../i18n/i18n'
import { DataTable, FreshnessBadge } from '../../ui/components'
import { Dialog } from '../../ui/Dialog'

/** Loja de equipamentos: onde fica e os itens desta categoria vendidos ali. */
export function ItemStoreDialog({
  terminalId,
  terminalName,
  items,
  prices,
  now,
  onClose,
}: {
  terminalId: number
  terminalName: string
  items: Item[]
  prices: ItemPrice[]
  now: number
  onClose: () => void
}) {
  const { t } = useI18n()
  const terminal = useTerminal(terminalId)
  const names = new Map(items.map((i) => [i.id, i.name]))
  const rows = prices
    .filter((p) => p.id_terminal === terminalId && p.price_buy > 0)
    .sort((a, b) => (names.get(a.id_item) ?? a.item_name).localeCompare(names.get(b.id_item) ?? b.item_name))

  return (
    <Dialog title={terminalName} onClose={onClose}>
      <p className="location-line">{terminal ? locationPath(terminal).join(' › ') : t('store.unknownLocation')}</p>
      <DataTable
        rows={rows}
        rowKey={(p) => p.id}
        empty={t('equip.noneHere')}
        columns={[
          { key: 'i', header: t('equip.item'), render: (p) => names.get(p.id_item) ?? p.item_name },
          { key: 'p', header: t('col.price'), align: 'right', render: (p) => `${formatAuec(p.price_buy)} aUEC` },
          { key: 'u', header: t('common.updated'), render: (p) => <FreshnessBadge dateModifiedSec={p.date_modified} now={now} /> },
        ]}
      />
    </Dialog>
  )
}
