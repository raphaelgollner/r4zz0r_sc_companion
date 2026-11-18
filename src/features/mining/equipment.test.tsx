import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, test } from 'vitest'
import { TerminalsContext } from '../../data/terminals'
import type { Item, ItemAttribute, ItemPrice } from '../../data/types'
import { I18nProvider } from '../../i18n/i18n'
import { NOW, terminal } from '../../test/fixtures'
import { EquipmentView } from './EquipmentView'

const item = (id: number, name: string, size: string, company = 'Greycat Industrial'): Item => ({ id, id_category: 29, name, company_name: company, size, category: 'Mining Laser Heads' })
const items = [item(107, 'Lancet MH2 Mining Laser', '2'), item(108, 'Arbor MH1 Mining Laser', '1'), item(109, 'Helix I Mining Laser', '1', 'Thermyte Concern'), item(110, 'Klein-S1 Mining Laser', '1', 'Shubin Interstellar')]
const a = (id_item: number, attribute_name: string, value: string, unit = ''): ItemAttribute => ({ id_item, attribute_name, value, unit })
const attrs = [a(107, 'Mining Laser Power', '1305-4350'), a(107, 'Laser Instability', '-10', '%'), a(107, 'Module Slots', '2'), a(108, 'Mining Laser Power', '189-1890')]
const prices: ItemPrice[] = [
  { id: 1, id_item: 107, id_terminal: 114, price_buy: 94000, date_modified: 1, item_name: 'Lancet MH2 Mining Laser', terminal_name: 'Dumpers Depot Area 18' },
  { id: 2, id_item: 107, id_terminal: 115, price_buy: 99000, date_modified: 1, item_name: 'Lancet MH2 Mining Laser', terminal_name: 'Shubin SAL-5' },
]
const terminals = new Map([[114, terminal(114, { star_system_name: 'Stanton', planet_name: 'ArcCorp', city_name: 'Area 18' })]])

function renderView() {
  render(
    <I18nProvider initial="pt">
      <TerminalsContext.Provider value={terminals}>
        <EquipmentView kind="lasers" onKind={() => {}} items={items} attrs={attrs} prices={prices} now={NOW} />
      </TerminalsContext.Provider>
    </I18nProvider>,
  )
}

describe('EquipmentView', () => {
  test('lasers com atributos e menor preço', () => {
    renderView()
    const row = screen.getByRole('row', { name: /Lancet MH2/ })
    expect(row).toHaveTextContent('1305-4350')
    expect(row).toHaveTextContent('-10 %')
    expect(row).toHaveTextContent('94.000')
  })

  test('filtro de tamanho S1 esconde o MH2', async () => {
    renderView()
    await userEvent.selectOptions(screen.getByLabelText('Tamanho'), '1')
    expect(screen.queryByRole('row', { name: /Lancet MH2/ })).toBeNull()
    expect(screen.getByRole('row', { name: /Arbor MH1/ })).toBeInTheDocument()
  })

  test('comparar até 3 lado a lado', async () => {
    renderView()
    for (const n of ['Lancet MH2', 'Arbor MH1', 'Helix I']) await userEvent.click(screen.getByRole('checkbox', { name: new RegExp(`Comparar ${n}`) }))
    expect(screen.getByRole('checkbox', { name: /Comparar Klein-S1/ })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: /Comparar \(3\)/ }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getAllByRole('columnheader')).toHaveLength(4)
    expect(dialog).toHaveTextContent('189-1890')
  })

  test('clicar na loja abre a janela com localização e item', async () => {
    renderView()
    await userEvent.click(screen.getByRole('row', { name: /Lancet MH2/ }))
    await userEvent.click(screen.getByRole('button', { name: /Dumpers Depot Area 18/ }))
    const dialog = screen.getByRole('dialog', { name: /Dumpers Depot Area 18/ })
    expect(dialog).toHaveTextContent('Stanton › ArcCorp › Area 18')
    expect(within(dialog).getByRole('row', { name: /Lancet MH2/ })).toHaveTextContent('94.000')
  })
})

describe('troca de categoria', () => {
  test('filtro de tamanho volta para Todos', async () => {
    function H() {
      const [kind, setKind] = useState<'lasers' | 'modules' | 'gadgets'>('lasers')
      return (
        <I18nProvider initial="pt">
          <EquipmentView kind={kind} onKind={setKind} items={items} attrs={attrs} prices={prices} now={NOW} />
        </I18nProvider>
      )
    }
    render(<H />)
    await userEvent.selectOptions(screen.getByLabelText('Tamanho'), '2')
    await userEvent.click(screen.getByRole('tab', { name: 'Módulos' }))
    expect(screen.getByLabelText('Tamanho')).toHaveValue('')
  })
})
