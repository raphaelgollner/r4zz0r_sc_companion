import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { I18nProvider } from '../../i18n/i18n'
import { updatePrefs, DEFAULT_PREFS } from '../../store/prefs'
import { NOW, SEC } from '../../test/fixtures'
import { FreshnessBadge } from '../../ui/components'
import { SettingsView } from './SettingsView'

function renderAll(onClearCache = vi.fn(async () => {})) {
  render(
    <I18nProvider initial="pt">
      <SettingsView version="0.1.0" onClearCache={onClearCache} />
      <div data-testid="badge">
        <FreshnessBadge dateModifiedSec={SEC - 13 * 3600} now={NOW} />
      </div>
    </I18nProvider>,
  )
  return onClearCache
}

describe('SettingsView', () => {
  beforeEach(() => {
    localStorage.clear()
    updatePrefs(DEFAULT_PREFS)
  })

  test('seletor de idioma troca a interface', async () => {
    renderAll()
    await userEvent.selectOptions(screen.getByLabelText('Idioma'), 'en')
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  test('limite de "envelhecendo" muda a cor do badge', async () => {
    renderAll()
    expect(screen.getByText('há 13 h')).toHaveClass('age-fresh')
    const input = screen.getByLabelText('Avisar dado envelhecendo após (h)')
    await userEvent.clear(input)
    await userEvent.type(input, '12')
    expect(screen.getByText('há 13 h')).toHaveClass('age-aging')
  })

  test('limpar cache chama a função e confirma', async () => {
    const onClear = renderAll()
    await userEvent.click(screen.getByRole('button', { name: 'Limpar cache' }))
    expect(onClear).toHaveBeenCalled()
    expect(await screen.findByText('Cache limpo.')).toBeInTheDocument()
  })

  test('sobre mostra versão, fonte e aviso', () => {
    renderAll()
    expect(screen.getByText('Versão 0.1.0')).toBeInTheDocument()
    expect(screen.getByText('Dados: UEX Corp (uexcorp.space)')).toBeInTheDocument()
    expect(screen.getAllByText(/Cloud Imperium Games/).length).toBeGreaterThan(0)
  })
})

describe('falha ao limpar cache', () => {
  test('avisa quando não consegue limpar', async () => {
    renderAll(vi.fn(async () => { throw new Error('x') }))
    await userEvent.click(screen.getByRole('button', { name: 'Limpar cache' }))
    expect(await screen.findByText('Não foi possível limpar o cache.')).toBeInTheDocument()
  })
})
