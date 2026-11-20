import { describe, expect, test } from 'vitest'
import css from './theme.css?raw'

describe('theme.css', () => {
  test('o fundo da página é a cor de fundo do tema, nunca a cor do texto sobre os botões', () => {
    const body = css.match(/\nbody\s*\{([^}]*)\}/)?.[1] ?? ''
    expect(body).toMatch(/background-color:\s*var\(--black\)/)
    expect(css).not.toMatch(/background(-color)?:\s*var\(--on-accent\)/)
  })
})
