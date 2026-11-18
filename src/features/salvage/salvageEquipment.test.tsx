import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, test } from 'vitest'
import type { Item, VehiclePrice } from '../../data/types'
import { I18nProvider } from '../../i18n/i18n'
import { NOW, SEC, vehicle } from '../../test/fixtures'
import { EquipmentView } from '../mining/EquipmentView'
import { SALVAGE_KINDS } from './screens'
import { SalvageShipsView } from './SalvageShipsView'

const item = (id: number, name: string, id_category: number): Item => ({ id, id_category, name, company_name: 'Greycat Industrial', size: '1', category: '' })

describe('SALVAGE Equipment', () => {
  test('abas de salvage e troca de categoria', async () => {
    const seen: string[] = []
    function H() {
      const [kind, setKind] = useState(SALVAGE_KINDS[0].key)
      seen.push(kind)
      const cat = SALVAGE_KINDS.find((k) => k.key === kind)!.category
      const items = [item(1, 'Abrade Scraper Module', 31), item(2, 'SureGrip S1 Tractor Beam', 67)].filter((i) => i.id_category === cat)
      return (
        <I18nProvider initial="pt">
          <EquipmentView kinds={SALVAGE_KINDS} kind={kind} onKind={setKind} items={items} attrs={[]} prices={[]} now={NOW} />
        </I18nProvider>
      )
    }
    render(<H />)
    for (const name of ['Scraper Beams', 'Tractor Beams', 'Salvage Beams']) expect(screen.getByRole('tab', { name })).toBeInTheDocument()
    expect(screen.getByRole('row', { name: /Abrade/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Tractor Beams' }))
    expect(screen.getByRole('row', { name: /SureGrip S1/ })).toBeInTheDocument()
    expect(screen.queryByRole('row', { name: /Abrade/ })).toBeNull()
  })
})

describe('SALVAGE Ships', () => {
  test('só naves de salvage, com o menor preço', () => {
    const vehicles = [
      vehicle(300, 'Vulture', 12, { name_full: 'Drake Vulture', is_salvage: 1 }),
      vehicle(301, 'Reclaimer', 420, { name_full: 'Aegis Reclaimer', is_salvage: 1 }),
      vehicle(41, 'Caterpillar', 576, { name_full: 'Drake Caterpillar' }),
    ]
    const purchases: VehiclePrice[] = [{ id: 1, id_vehicle: 300, id_terminal: 3, price_buy: 4_500_000, date_modified: SEC, vehicle_name: 'Vulture', terminal_name: 'Astro Armada' }]
    render(
      <I18nProvider initial="pt">
        <SalvageShipsView vehicles={vehicles} purchases={purchases} rentals={[]} now={NOW} />
      </I18nProvider>,
    )
    expect(screen.getByRole('row', { name: /Drake Vulture/ })).toHaveTextContent('4.500.000')
    expect(screen.getByRole('row', { name: /Aegis Reclaimer/ })).toBeInTheDocument()
    expect(screen.queryByRole('row', { name: /Caterpillar/ })).toBeNull()
  })
})
