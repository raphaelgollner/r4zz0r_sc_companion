import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'
import { placeTooltip, Tooltip } from './Tooltip'

const rect = (top: number, left: number, w = 80, h = 20) =>
  ({ top, left, bottom: top + h, right: left + w, width: w, height: h, x: left, y: top, toJSON: () => ({}) }) as DOMRect
const vp = { width: 1000, height: 800 }
const box = { width: 200, height: 30 }

describe('placeTooltip', () => {
  test('abre acima por padrão', () => {
    expect(placeTooltip(rect(200, 100), box, vp)).toEqual({ top: 200 - 30 - 6, left: 100, below: false })
  })
  test('perto do topo abre para baixo', () => {
    expect(placeTooltip(rect(10, 100), box, vp)).toEqual({ top: 30 + 6, left: 100, below: true })
  })
  test('perto da borda direita fica dentro da janela', () => {
    expect(placeTooltip(rect(200, 950), box, vp).left).toBe(1000 - 200 - 4)
  })
  test('nunca passa da borda esquerda', () => {
    expect(placeTooltip(rect(200, -50), box, vp).left).toBe(4)
  })
})

describe('Tooltip em portal', () => {
  test('a dica não fica dentro do card que corta o conteúdo', async () => {
    render(
      <div data-testid="card" style={{ overflow: 'hidden', clipPath: 'inset(0)' }}>
        <Tooltip content="Stanton › Hurston › Lorville">
          <span>Lorville</span>
        </Tooltip>
      </div>,
    )
    await userEvent.hover(screen.getByText('Lorville'))
    const tip = screen.getByRole('tooltip')
    expect(screen.getByTestId('card').contains(tip)).toBe(false)
    expect(tip.parentElement).toBe(document.body)
  })
})
