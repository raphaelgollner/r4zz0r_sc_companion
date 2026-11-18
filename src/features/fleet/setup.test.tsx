import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, test } from 'vitest'
import { createRateLimiter } from '../../api/rateLimiter'
import { memoryStore } from '../../cache/store'
import { UexProvider } from '../../data/useUex'
import type { FleetEntry } from '../../domain/fleet'
import { I18nProvider } from '../../i18n/i18n'
import { vehicle } from '../../test/fixtures'
import arbor from '../../test/wiki/arbor-mh1.json'
import focus from '../../test/wiki/focus-iii.json'
import lancet from '../../test/wiki/lancet-mh2.json'
import mole from '../../test/wiki/mole.json'
import { SetupDialog } from './SetupDialog'

const limiter = createRateLimiter({ maxPerWindow: 10_000, windowMs: 1 })
const LANCET = lancet.data.uuid
const MOLE = vehicle(122, 'Mole', 96, { name_full: 'Argo Mole', uuid: 'mole-uuid', is_mining: 1 })
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

type Wiki = { vehicle?: unknown; status?: number }
function makeFetch({ vehicle: v = mole.data, status = 200 }: Wiki = {}) {
  return (async (url: string) => {
    if (url.includes('api.star-citizen.wiki')) {
      if (url.includes('/vehicles/')) return status === 200 ? json({ data: v }) : json({ message: 'x' }, status)
      if (url.includes('WeaponMining')) return json({ data: [lancet.data, arbor.data], links: { next: null } })
      if (url.includes('MiningModifier')) return json({ data: [focus.data], links: { next: null } })
      return json({ data: [], links: { next: null } })
    }
    if (url.includes('/items/') && url.includes('id_category=29'))
      return json({ status: 'ok', data: [{ id: 500, uuid: LANCET, id_category: 29, name: 'Lancet MH2 Mining Laser', company_name: null, size: '2', category: 'Mining Laser Heads' }] })
    if (url.includes('/items_prices/') && url.includes('id_category=29'))
      return json({ status: 'ok', data: [{ id: 1, id_item: 500, id_terminal: 9, price_buy: 94_000, date_modified: 1, item_name: 'Lancet MH2 Mining Laser', terminal_name: 'Dumpers Depot' }] })
    return json({ status: 'ok', data: [] })
  }) as unknown as typeof fetch
}

function Harness({ wiki, ship = MOLE, usd = null }: { wiki?: Wiki; ship?: typeof MOLE; usd?: number | null }) {
  const [entry, setEntry] = useState<FleetEntry>({ id: 'a', vehicleId: ship.id, nickname: '', note: '', addedAt: 0, setup: {} })
  return (
    <I18nProvider initial="pt">
      <UexProvider value={{ store: memoryStore(), fetchFn: makeFetch(wiki), limiter }}>
        <SetupDialog entry={entry} vehicle={ship} usd={usd} onUpdate={(p) => setEntry((e) => ({ ...e, ...p }))} onClose={() => {}} />
        <output data-testid="setup">{JSON.stringify(entry.setup)}</output>
      </UexProvider>
    </I18nProvider>
  )
}
const setupNow = () => JSON.parse(screen.getByTestId('setup').textContent!) as Record<string, string>

describe('SetupDialog', () => {
  test('Mole: descrição, papel e 3 lasers com o de fábrica', async () => {
    render(<Harness />)
    const dialog = screen.getByRole('dialog', { name: /Argo Mole/ })
    expect(await within(dialog).findByText('Medium Mining')).toBeInTheDocument()
    expect(dialog).toHaveTextContent(/ARGO/)
    for (const n of [1, 2, 3]) expect(within(dialog).getByRole('combobox', { name: `Laser ${n}` })).toHaveDisplayValue(/Arbor MH2 Mining Laser/)
  })

  test('trocar o laser grava no setup e mostra o custo', async () => {
    render(<Harness />)
    const laser1 = await screen.findByRole('combobox', { name: 'Laser 1' })
    await waitFor(() => expect(within(laser1).getAllByRole('option').length).toBeGreaterThan(1))
    await userEvent.selectOptions(laser1, LANCET)
    expect(Object.values(setupNow())).toEqual([LANCET])
    await waitFor(() => expect(screen.getByTestId('setup-cost')).toHaveTextContent('94.000'))
  })

  test('aplicar a build Estável preenche os lasers e mostra o critério', async () => {
    render(<Harness />)
    const btn = await screen.findByRole('button', { name: /Aplicar Estável/ })
    await waitFor(() => expect(within(screen.getByRole('combobox', { name: 'Laser 1' })).getAllByRole('option').length).toBeGreaterThan(1))
    expect(screen.getByText(/menos instabilidade/i)).toBeInTheDocument()
    await userEvent.click(btn)
    for (const n of [1, 2, 3]) expect(screen.getByRole('combobox', { name: `Laser ${n}` })).toHaveValue(LANCET)
    await userEvent.click(screen.getByRole('button', { name: 'Voltar ao de fábrica' }))
    expect(setupNow()).toEqual({})
  })

  test('Wiki fora do ar: mensagem com Atualizar', async () => {
    render(<Harness wiki={{ status: 404 }} />)
    expect(await screen.findByText(/Não foi possível carregar os dados da Wiki/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Atualizar' })).toBeInTheDocument()
  })

  test('nave só com armas: sem setup industrial', async () => {
    const guns = { uuid: 'g', name: 'Gladius', role: 'Light Fighter', ports: [{ name: 'gun', type: 'WeaponGun', sub_type: 'Gun', sizes: { min: 3, max: 3 }, editable: true, ports: [] }] }
    render(<Harness wiki={{ vehicle: guns }} ship={vehicle(9, 'Gladius', 0, { name_full: 'Aegis Gladius', uuid: 'g' })} />)
    expect(await screen.findByText('Sem setup industrial para esta nave')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Aplicar/ })).toBeNull()
  })

  test('sem preço em dólar no UEX: usa o msrp da Wiki como referência', async () => {
    render(<Harness usd={null} />)
    expect(await screen.findByText(/US\$ 315/)).toBeInTheDocument()
  })
})
