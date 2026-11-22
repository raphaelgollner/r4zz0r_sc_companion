/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

const css = readFileSync('src/ui/theme.css', 'utf-8')

describe('theme.css', () => {
  test('o fundo da página é a cor de fundo do tema, nunca a cor do texto sobre os botões', () => {
    const body = css.match(/\nbody\s*\{([^}]*)\}/)?.[1] ?? ''
    expect(body).toMatch(/background-color:\s*var\(--black\)/)
    expect(css).not.toMatch(/background(-color)?:\s*var\(--on-accent\)/)
  })
})
