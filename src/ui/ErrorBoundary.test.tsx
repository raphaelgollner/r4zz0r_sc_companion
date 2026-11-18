import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { I18nProvider } from '../i18n/i18n'
import { ErrorBoundary } from './ErrorBoundary'

function Bomb({ explode }: { explode: boolean }) {
  if (explode) throw new Error('dado ruim')
  return <p>tudo certo</p>
}

describe('ErrorBoundary', () => {
  test('erro numa tela mostra mensagem e "Tentar de novo" recupera', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    function Harness() {
      const [explode, setExplode] = useState(true)
      return (
        <I18nProvider initial="pt">
          <button onClick={() => setExplode(false)}>consertar</button>
          <ErrorBoundary>
            <Bomb explode={explode} />
          </ErrorBoundary>
        </I18nProvider>
      )
    }
    render(<Harness />)
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar os dados do UEX.')
    await userEvent.click(screen.getByText('consertar'))
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(screen.getByText('tudo certo')).toBeInTheDocument()
  })
})
