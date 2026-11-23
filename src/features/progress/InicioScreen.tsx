import { useState } from 'react'
import type { Commodity, PriceRow, Terminal } from '../../data/types'
import { useUex } from '../../data/useUex'
import { useI18n } from '../../i18n/i18n'
import { Tabs } from '../../ui/components'
import { ImportView } from './ImportView'
import type { ImportDeps } from './importService'
import { ProgressView } from './ProgressView'

type HomeTab = 'record' | 'import'

export function HomeTabs({ record, imported }: { record: () => React.ReactNode; imported: () => React.ReactNode }) {
  const { t } = useI18n()
  const [tab, setTab] = useState<HomeTab>('record')
  return (
    <>
      <Tabs
        items={[
          { key: 'record', label: t('home.record') },
          { key: 'import', label: t('home.import') },
        ]}
        active={tab}
        onChange={setTab}
        sub
      />
      {tab === 'record' ? record() : imported()}
    </>
  )
}

function ImportScreen({ deps }: { deps?: ImportDeps }) {
  const commodities = useUex<Commodity[]>('commodities')
  const terminals = useUex<Terminal[]>('terminals')
  const prices = useUex<PriceRow[]>('commodities_prices_all')
  return <ImportView commodities={commodities.data ?? undefined} terminals={terminals.data ?? undefined} prices={prices.data ?? undefined} deps={deps} />
}

export function InicioScreen() {
  const commodities = useUex<Commodity[]>('commodities')
  const terminals = useUex<Terminal[]>('terminals')
  return (
    <HomeTabs
      record={() => <ProgressView commodities={commodities.data ?? undefined} terminals={terminals.data ?? undefined} />}
      imported={() => <ImportScreen />}
    />
  )
}
