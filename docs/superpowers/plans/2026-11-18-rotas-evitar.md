# Rotas "Evitar" + card em destaque — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Excluir sistemas/planetas/lugares das rotas (compra e venda) e destacar estações e preços no card.

**Architecture:** Função pura `avoidMatch` + opções em `src/domain/avoid.ts`; `computeRoutes` recebe `avoid`; `Prefs.avoid` persiste; componente `AvoidPicker` usado por `RouteControls` (compacto e completo); `RouteCard` reorganizado.

**Tech Stack:** React 19, TypeScript, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-18-rotas-evitar-design.md`

## Global Constraints
- UI em PT-BR/EN via `dict.ts`; nomes de produtos e lugares em inglês como vêm do UEX.
- Lugar = `moon_name || space_station_name || city_name || outpost_name` (igual a `buildLocationTree`).
- Terminal ausente do mapa nunca é excluído.
- `npm test` e `npm run lint` verdes ao fim de cada task.

## Review Focus
- Prefs antigos sem `avoid` (ou `avoid` malformado) → lista vazia, sem erro.
- Mesmo nome de planeta em sistemas diferentes (ex.: "Pyro I" não colide com Stanton) → casa por sistema + planeta.
- Terminal sem planeta (espaço profundo) → só casa com item de sistema.
- Etiqueta duplicada → adicionar o mesmo item duas vezes não duplica.
- Card continua com o botão de copiar em cada estação, sem botão aninhado.

---

### Task 1: domínio `avoid` + `computeRoutes`

**Files:** Create `src/domain/avoid.ts`, `src/domain/avoid.test.ts`; Modify `src/domain/routes.ts`, `src/domain/routes.test.ts`

**Interfaces — Produces:**
- `interface AvoidEntry { system: string; planet?: string; place?: string }`
- `placeOf(t: Terminal): string | null`
- `avoidMatch(t: Terminal | undefined, avoid: AvoidEntry[]): boolean`
- `avoidKey(e: AvoidEntry): string` (ex.: `Stanton/Crusader/`)
- `avoidLabel(e: AvoidEntry): string` (o nível mais fundo)
- `avoidOptions(terminals: Terminal[]): AvoidEntry[]` — sistemas, planetas e lugares únicos de terminais `commodity`/`commodity_raw`, ordenados sistema › planeta › lugar
- `RouteInput.avoid?: AvoidEntry[]`

- [ ] Testes (RED): `avoidMatch` para sistema (Nyx exclui terminal de Nyx, não de Stanton); planeta (Stanton/Crusader exclui terminal com moon Yela e o de CRU-L1; não exclui Pyro/"Crusader" fictício); lugar (Stanton/Crusader/Yela exclui GrimHEX, não Daymar); `undefined` → false; `avoidOptions` sem duplicatas e sem terminais de outro tipo. Em `routes.test.ts`: `avoid: [{system:'Pyro'}]` remove rota cuja **venda** está em Pyro e rota cuja **compra** está em Pyro.
- [ ] Rodar `npx vitest run src/domain` → FAIL.
- [ ] Implementar; em `computeRoutes`, `continue` se `avoidMatch(terminals.get(buy.id_terminal), avoid)` (antes do laço de vendas) ou da venda.
- [ ] `npx vitest run src/domain` → PASS; commit `feat: domínio da lista Evitar nas rotas`.

### Task 2: prefs + `useRouteResult`

**Files:** Modify `src/store/prefs.ts`, `src/store/prefs.test.ts`, `src/features/trade/useRouteResult.ts`

- [ ] Teste (RED): `DEFAULT_PREFS.avoid` é `[]`; `loadPrefs` com `avoid: 'x'` salvo devolve `[]`; com prefs antigos sem `avoid` devolve `[]`.
- [ ] Implementar (`avoid: AvoidEntry[]` em `Prefs`, saneado em `loadPrefs` para array de objetos com `system` string); `useRouteResult` passa `avoid`.
- [ ] Testes verdes; commit `feat: lista Evitar salva nas preferências`.

### Task 3: `AvoidPicker` em ROTAS e TRADE

**Files:** Create `src/features/trade/AvoidPicker.tsx`, `src/features/trade/avoid.test.tsx`; Modify `RouteControls.tsx`, `src/i18n/dict.ts`, `src/ui/theme.css`

**Interfaces:** `AvoidPicker({ terminals: Terminal[]; value: AvoidEntry[]; onChange: (v: AvoidEntry[]) => void })`, usando `SearchPicker` (`sub` = "sistema"/"planeta · Stanton"/"Crusader · Stanton").

- [ ] Teste (RED) com `RoutesView`: digitar "Pyr" no combobox "Evitar", escolher Pyro → etiqueta "Pyro" aparece e o card com terminal em Pyro some; clicar "Remover Pyro" → volta. Também no `HomeView` (compacto) o campo "Evitar" existe. Item já evitado não aparece nas opções.
- [ ] Implementar; render em `RouteControls` fora do bloco `!compact`. Chaves i18n: `routes.avoid` (Evitar / Avoid), `routes.avoidAdd` (Adicionar lugar a evitar… / Add a place to avoid…), `routes.avoidRemove` (Remover {name} / Remove {name}), `routes.avoidSystem` (sistema / system), `routes.avoidPlanet` (planeta / planet).
- [ ] Testes + lint verdes; commit `feat: campo Evitar em ROTAS e TRADE`.

### Task 4: card em destaque

**Files:** Modify `RouteCard.tsx`, `theme.css`, `routes.ui.test.tsx`, `routeControls.test.tsx` (se o regex mudar)

- [ ] Teste (RED): no card, `getByRole('heading', {name: 'Laranite'})`; o lucro `≈ 630.602 aUEC` está dentro do `header`; cada `dd` de COMPRA/VENDE contém um elemento `.route-stop` com o nome da estação; não há mais `.route-path`. Atualizar regex de COMPRA para `/COMPRA.*7\.047\/SCU/`.
- [ ] Implementar conforme o esboço do spec (h3 18 px; `.route-stop` 16 px, branco, 600; preço `/SCU` em negrito; linha LUCRO removida).
- [ ] `npm test` + `npm run lint` verdes; commit `feat: card de rota com estações e preços em destaque`.

### Task 5: verificação no app

- [ ] `npm run tauri build`, abrir o exe com CDP, em ROTAS evitar Nyx + Pyro + Crusader e conferir que nenhum card cita esses lugares; screenshot.
