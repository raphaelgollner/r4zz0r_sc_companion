# Ajustes de uso + MINERAÇÃO — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir os pontos de uso do backlog (tooltip cortado, SCU vazio, saldo ≤ 0, atualizar por tela, histórico de preços, mensagens de erro, itens técnicos) e entregar a aba MINERAÇÃO (Ores, Refineries, Refine Planner, Equipment, Ground Mining).

**Architecture:** Mesmo padrão (domínio puro testado + views por props + screens com hooks). O hook de dados ganha consultas com parâmetros (`useUexQuery`) para histórico de preços, itens por categoria e distâncias. Tooltip vira portal com posição fixa.

**Tech Stack:** React 19, TypeScript, Vitest + Testing Library, idb-keyval, Tauri 2.

**Spec:** `docs/superpowers/specs/2026-11-18-ajustes-e-mineracao-design.md`

## Global Constraints
- Texto novo via `t()` em `pt` e `en`; nomes de produtos/terminais/itens nunca traduzidos.
- Estimativas sempre rotuladas: texto fixo do Refine Planner — pt "Estimativa: não inclui o rendimento do método nem a taxa da refinaria, que o UEX não informa." / en "Estimate: does not include the method yield or the refinery fee, which UEX does not provide."
- TTL: `refineries_yields`, `refineries_capacities` 12 h; `refineries_methods` 7 dias; `commodities_raw_prices_all` 30 min; `items` e `items_attributes` por categoria 12 h; `items_prices` por categoria 1 h; `commodities_prices_history` por par 1 h; `terminals_distances` por par 7 dias.
- Categorias de itens de mineração: Mining Laser Heads `29`, Mining Modules `30`, Gadgets `28`.
- Minério bruto → refinado: nome sem o sufixo `" (Raw)"` ou `" (Ore)"`; se não houver commodity com esse nome, sem refinado.
- Limite de consultas inalterado (≤ 100/min).

## Review Focus
1. **Local atual sem distância no UEX para alguma refinaria** → coluna mostra "—", ranking por distância coloca essas por último, nada quebra. (Task 7)
2. **Carga do Refine Planner vazia ou com SCU 0/inválido** → sem ranking, mensagem "Adicione minério e SCU à carga."; sem consultas de distância. (Task 7)
3. **Minério sem preço refinado ou sem bônus na refinaria** → refinaria usa bônus 0 e o minério conta só se tiver preço; linha indica "sem preço" e não vira NaN. (Task 7)
4. **Tooltip perto da borda de cima/direita da janela** → abre para baixo / fica dentro da tela. (Task 1)
5. **Fechar o app logo após digitar no PROGRESSO** → o último texto é gravado (flush ao desmontar/sair). (Task 2)

---

### Task 1: Tooltip em portal, nunca cortado

**Files:** Modify `src/ui/Tooltip.tsx`, `src/ui/theme.css`; Test `src/ui/tooltip.test.tsx`

**Interfaces:** Produces `Tooltip({ content, children, focusable? })` (mesma API). A caixa é renderizada com `createPortal` em `document.body`, `role="tooltip"`, `position: fixed`, estilo `top/left` calculado por `placeTooltip(target: DOMRect, box: { width: number; height: number }, viewport: { width: number; height: number }, gap = 6): { top: number; left: number; below: boolean }` exportada do mesmo arquivo — acima por padrão; abaixo se `target.top - box.height - gap < 0`; `left` limitado a `[4, viewport.width - box.width - 4]`.

- [ ] **Step 1: Testes que falham**: `placeTooltip` com alvo em `top 200` → `below false`, `top = 200 - h - 6`; alvo em `top 10` → `below true`, `top = target.bottom + 6`; alvo na borda direita → `left = vw - w - 4`; render: hover num alvo dentro de um `div` com `overflow:hidden` → o `tooltip` não é descendente desse `div` (`div.contains(tooltip) === false`) e é filho de `document.body`.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar (medir a caixa num `useLayoutEffect` após abrir; reposicionar em `scroll`/`resize` enquanto aberta). **Step 4:** `npm test` PASS. **Step 5:** Commit `fix: tooltip em portal, sem cortes`.

### Task 2: Ajustes pequenos de uso

**Files:** Modify `src/features/trade/RouteControls.tsx`, `src/features/trade/routeControls.test.tsx`, `src/ui/components.tsx` (LoadState), `src/features/settings/SettingsView.tsx`, `src/store/progress.tsx`, `src/features/home/HomeScreen.tsx`, `src/i18n/dict.ts`; Tests nos arquivos de teste existentes + `src/store/progress.test.tsx`, `src/ui/components.test.tsx`, `src/features/settings/settings.test.tsx`

**Interfaces:**
- `RouteControls`: texto de SCU vazio → remove `scuOverrides[shipId]`; o texto só é reformatado ao sair do campo (`onBlur`), não durante a digitação. "Usar meu saldo" `disabled` quando `balance <= 0`, envolvido em `Tooltip` com `t('routes.balanceEmpty')` (pt "Seu saldo está zerado ou negativo." / en "Your balance is zero or negative.").
- `errorKind(code: string): 'offline' | 'rate' | 'server'` em `src/ui/components.tsx` — `network`/`timeout` → offline; `requests_limit_reached`/`http_429` → rate; demais → server. `load.staleWarning` vira três chaves `load.stale.offline` ("Sem conexão com o UEX. Mostrando dados salvos."), `load.stale.rate` ("Limite de consultas do UEX atingido. Mostrando dados salvos; tente de novo em 1 minuto."), `load.stale.server` ("O UEX respondeu com erro ({code}). Mostrando dados salvos.").
- SettingsView: falha em `onClearCache` mostra `t('settings.cacheClearFailed')` ("Não foi possível limpar o cache.").
- `ProgressProvider`: grava com atraso de 400 ms (último estado vence); grava imediatamente no `beforeunload`, ao desmontar e em `visibilitychange` para `hidden`.
- HomeScreen: painel de cache inclui `vehicles_purchases_prices_all` e `vehicles_rentals_prices_all`.
- [ ] **Step 1: Testes que falham**: apagar o SCU remove o override (`scuOverrides` sem a chave) e o campo mostra o SCU do UEX ao sair; digitar "10,5" mantém "10,5" até o blur; saldo `-5` → botão desabilitado; LoadState com `error 'requests_limit_reached'` mostra o texto de limite, `'network'` o de sem conexão, `'http_500'` o de erro com o código; clearCache que rejeita → mensagem de falha; ProgressProvider com fake timers: 3 `apply` em 100 ms → 1 `set` após 400 ms; `apply` e desmontar antes de 400 ms → `set` chamado (Review Focus 5).
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** PASS. **Step 5:** Commit `fix: ajustes de uso do backlog`.

### Task 3: Consultas com parâmetros e botão Atualizar por tela

**Files:** Modify `src/data/useUex.tsx`, `src/data/ttl.ts`, `src/features/trade/screens.tsx` (`Loaded`), `src/i18n/dict.ts`; Test `src/data/useUexQuery.test.tsx`, `src/features/trade/refresh.test.tsx`

**Interfaces:**
- `useUexQuery<T>(resource: string, params: Record<string, string | number> | null, ttlMs: number): UexState<T>` — chave de cache `resource?` + parâmetros ordenados; `params === null` → não busca (`data null`, `loading false`). Mesma lógica de `useUex` (peek + getResource + refreshAll).
- `TTL_MS` ganha `refineries_yields`, `refineries_capacities`, `refineries_methods`, `commodities_raw_prices_all`; constantes exportadas `QUERY_TTL = { items: 12h, items_attributes: 12h, items_prices: 1h, commodities_prices_history: 1h, terminals_distances: 7d }`.
- `Loaded` ganha prop opcional `onRefresh` e mostra botão `t('common.refresh')` no canto superior direito chamando `refresh()` de todos os estados; desabilitado enquanto algum carrega. Todas as telas de TRADE, NAVES e MINERAÇÃO passam a usá-lo.
- [ ] **Step 1: Testes que falham**: `useUexQuery('items', { id_category: 29 }, …)` chama a URL `…/items/?id_category=29` e guarda na chave `items?id_category=29`; parâmetros em outra ordem usam a mesma chave; `null` não chama a API; numa tela de TRADE, clicar "Atualizar" faz nova busca (fetch chamado de novo com cache ainda válido).
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** PASS. **Step 5:** Commit `feat: consultas com parâmetros e Atualizar por tela`.

### Task 4: Histórico de preços em Commodities

**Files:** Modify `src/features/trade/CommoditiesView.tsx`, `src/features/trade/screens.tsx`, `src/ui/Sparkline.tsx` (aceitar 2 séries), `src/i18n/dict.ts`; Create `src/domain/history.ts`; Test `src/domain/history.test.ts`, `src/features/trade/history.test.tsx`

**Interfaces:**
- `PriceHistoryPoint` (`price_buy, price_sell, date_added`) em `types.ts`; `historySeries(points: PriceHistoryPoint[]): { buy: number[]; sell: number[]; from: number; to: number }` — ordena por data, ignora zeros na série correspondente.
- `Sparkline({ series: { values: number[]; color: string; label: string }[] })` (mantém `points` para compatibilidade).
- Em Commodities, clicar numa linha de terminal do detalhe mostra abaixo "Histórico em {terminal}" com as séries compra (laranja) e venda (verde), período e legenda; busca via `useUexQuery('commodities_prices_history', { id_commodity, id_terminal }, 1h)`; com menos de 2 pontos: "Sem histórico suficiente neste terminal."
- [ ] **Step 1: Testes que falham**: `historySeries` ordena e separa; view com histórico mockado mostra o título com o terminal e duas linhas no SVG; com 1 ponto mostra a mensagem.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** PASS. **Step 5:** Commit `feat: histórico de preços por terminal`.

### Task 5: Regras de mineração

**Files:** Create `src/domain/mining.ts`, `src/domain/mining.test.ts`; Modify `src/data/types.ts`

**Interfaces:**
- Tipos: `RefineryYield` (`id_commodity, id_terminal, commodity_name, terminal_name, value, date_modified`), `RefineryMethod` (`id, name, code, rating_yield, rating_cost, rating_speed`), `RefineryCapacity` (`id_terminal, terminal_name, value, date_modified`), `RawPriceRow` (`id, id_commodity, id_terminal, price_sell, date_modified, commodity_name, terminal_name`), `Item` (`id, id_category, name, company_name, size, category`), `ItemAttribute` (`id_item, attribute_name, value, unit`), `ItemPrice` (`id, id_item, id_terminal, price_buy, date_modified, item_name, terminal_name`), `TerminalDistance` (`distance: string`).
- `refinedOf(raw: Commodity, all: Commodity[]): Commodity | null` (regra das Global Constraints).
- `oreSummary(raws: Commodity[] /* is_raw && is_extractable ou nome com (Raw)/(Ore) */, all, rawPrices, prices): OreRow[]` com `OreRow { ore: Commodity; refined: Commodity | null; bestRaw: RawPriceRow | null; bestRefined: PriceRow | null; uplift: number | null /* (refinado/bruto - 1)*100 */ }`.
- `refineryMatrix(yields: RefineryYield[]): { terminals: { id: number; name: string }[]; ores: { id: number; name: string }[]; value(terminalId, oreId): number | null }`.
- `interface CargoLine { oreId: number; scu: number }`; `refinePlan(cargo: CargoLine[], yields, refinedPrice: (oreId) => number | null, distance: (terminalId) => number | null, refineries: { id: number; name: string }[], sortBy: 'value' | 'distance'): RefinePlanRow[]` com `RefinePlanRow { terminalId; terminalName; avgBonus /* ponderado por SCU */; estValue /* Σ scu × preço × (1 + bônus/100) */; missingPrice: number[] /* oreIds sem preço */; distance: number | null }`; linhas com SCU ≤ 0 ou inválido são ignoradas; carga efetiva vazia → `[]`.
- `sellRawValue(cargo, bestRawPrice: (oreId) => number | null): number`.
- `attr(attrs: ItemAttribute[], itemId: number, name: string): string | null` (valor + unidade, vazio → null).
- [ ] **Step 1: Testes que falham** (valores exatos): `refinedOf('Laranite (Raw)')` → Laranite; `'Ice (Raw)'` sem 'Ice' → null; `oreSummary` uplift com bruto 3.000 e refinado 8.700 → 190; `refinePlan` com carga `[{Quantainium 12}, {Laranite 8}]`, preços 148.409 e 8.600, refinaria A bônus +5/−2, B sem dados → A `estValue = 12×148409×1.05 + 8×8600×0.98 = 1.937.388,6 + 67.424 = 2.004.812,6`, `avgBonus = (12×5 + 8×(−2))/20 = 2,2`; B bônus 0 → `estValue = 1.780.908 + 68.800 = 1.849.708`; ordena por valor A,B; por distância com A 120, B null → A, B (Review Focus 1); carga `[{x, 0}]` → `[]` (Review Focus 2); minério sem preço → listado em `missingPrice` e fora do valor, sem NaN (Review Focus 3); `attr` devolve "1305-4350" e "-10 %"; valor vazio → null.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** PASS. **Step 5:** Commit `feat: regras de mineração`.

### Task 6: MINERAÇÃO — Ores, Refineries, Ground Mining

**Files:** Create `src/features/mining/OresView.tsx`, `RefineriesView.tsx`, `GroundView.tsx`, `screens.tsx`, `mining.test.tsx`; Modify `src/app/App.tsx` (aba `mining` habilitada, sub-abas `ores | refineries | planner | equipment | ground`, hash `#mining/<sub>`), `src/app/screens.tsx`, `src/i18n/dict.ts`, `src/ui/theme.css`

**Interfaces:** Views por props; screens com `useUex`/`useUexQuery` + `Loaded onRefresh`. Sub-abas com nomes em inglês nos dois idiomas: Ores, Refineries, Refine Planner, Equipment, Ground Mining.
- Ores: colunas Minério, Melhor venda bruto (TerminalName + preço), Refinado (nome + melhor venda), Ganho ao refinar (%), Onde aparece.
- Refineries: matriz refinaria × minério (célula verde > 0, vermelha < 0, "—" sem dado), filtro por minério (select), coluna Capacidade %; quadro de métodos com notas traduzidas (pt baixo/médio/alto, en low/medium/high) para Rendimento/Custo/Velocidade.
- Ground Mining: gemas (`is_harvestable && is_raw && ids_planets/moons` com venda em `commodities_prices_all`) com melhor venda e onde aparecem; veículos `is_ground_vehicle && is_mining` com menor compra/aluguel (de NAVES).
- [ ] **Step 1: Testes que falham**: aba MINERAÇÃO habilitada e mostra as 5 sub-abas; Ores mostra Laranite (Raw) com refinado Laranite e ganho "190,0%" (fixtures); Refineries filtra por Quantainium e mostra "+5" verde e "−2" vermelho; métodos com "Rendimento: alto" etc.; Ground lista Hadanite com melhor venda e ROC com preço.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** PASS. **Step 5:** Commit `feat: MINERAÇÃO ores, refinarias e mineração em solo`.

### Task 7: MINERAÇÃO — Refine Planner

**Files:** Create `src/features/mining/PlannerView.tsx`, `src/features/mining/planner.test.tsx`, `src/store/minerPrefs.ts`; Modify `src/features/mining/screens.tsx`, `src/i18n/dict.ts`

**Interfaces:**
- `minerPrefs` (localStorage `tayko.mining`): `{ cargo: CargoLine[]; locationId: number | null; sortBy: 'value' | 'distance' }`, mesmo padrão de `usePrefs`.
- PlannerView: lista da carga (minério via picker só com minérios refináveis, SCU, remover), "Adicionar minério", local atual (picker de terminais por nome/lugar), ordenar; tabela: Refinaria (TerminalName), Bônus médio, Valor estimado, Distância (Gm), avisos de minério sem preço; card "Vender bruto" com `sellRawValue`; o texto fixo de estimativa.
- Distâncias: `useDistances(origin: number | null, refineryIds: number[])` faz `useUexQuery('terminals_distances', { id_terminal_origin, id_terminal_destination }, 7d)` só quando há local e carga válida — implementado como um componente invisível por refinaria ou um hook que agenda as consultas e devolve `Map<number, number | null>`; nunca refaz consultas ao mudar SCU.
- [ ] **Step 1: Testes que falham**: carga vazia → "Adicione minério e SCU à carga." e nenhum fetch de distância (Review Focus 2); com a carga do Task 5 → A antes de B com "2.004.813" e "1.849.708"; trocar ordenação para distância com distâncias mockadas (A 120, B indisponível) → A, B e "—" em B (Review Focus 1); mudar SCU não dispara nova consulta de distância; texto de estimativa visível; carga persiste após remontar.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** PASS. **Step 5:** Commit `feat: Refine Planner`.

### Task 8: MINERAÇÃO — Equipment

**Files:** Create `src/features/mining/EquipmentView.tsx`, `src/features/mining/ItemStoreDialog.tsx`, `src/features/mining/equipment.test.tsx`; Modify `src/features/mining/screens.tsx`, `src/i18n/dict.ts`, `src/ui/theme.css`

**Interfaces:**
- Seletor Lasers / Módulos / Gadgets (categorias 29/30/28) via `useUexQuery('items' | 'items_attributes' | 'items_prices', { id_category })`.
- Colunas fixas: Item, Fabricante, Tamanho, Menor preço, Onde comprar (n lojas). Colunas de atributo — Lasers: Mining Laser Power, Extraction Laser Power, Optimal Range, Laser Instability, Resistance, Inert Material Level, Optimal Charge Window Size, Module Slots; Módulos e Gadgets: todos os atributos não vazios exceto "Volume"/"Size"/"Item Type" aparecem num tooltip "Efeitos" e "Item Type" vira coluna Tipo. Rótulos de atributo em inglês (como no jogo).
- Busca, filtro de tamanho (Todos/S0/S1/S2) e "Comparar" (checkbox, até 3) que abre um `Dialog` com os atributos lado a lado.
- `ItemStoreDialog({ terminalId, terminalName, items, prices, onClose })` — localização + itens de mineração vendidos ali com preço.
- [ ] **Step 1: Testes que falham**: Lasers mostra "Lancet MH2 Mining Laser" com "1305-4350", "-10 %", menor preço "94.000"; filtro S1 esconde o MH2; marcar 3 e "Comparar" abre o diálogo com 3 colunas; marcar o 4º fica desabilitado; clicar numa loja abre a janela com a localização e o item.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** PASS. **Step 5:** Commit `feat: equipamentos de mineração`.

### Task 9: Técnico, conferência visual e instalador 0.3.0
- [ ] **Step 1:** `.gitattributes` com `* text=auto eol=lf` e `*.png binary`; `git add --renormalize .`; commit `chore: normaliza quebras de linha`.
- [ ] **Step 2:** CSP em `src-tauri/tauri.conf.json`: `default-src 'self'; connect-src 'self' https://api.uexcorp.uk; img-src 'self' data: https://assets.uexcorp.space; style-src 'self' 'unsafe-inline'; font-src 'self' data:`. Verificar com `npm run tauri build` e abrir o app (janela sobe, dados carregam — conferir rodando o exe e vendo que não há erro de CSP no log/console via build debug se preciso).
- [ ] **Step 3:** Conferência visual com dados reais (script CDP): MINERAÇÃO (5 sub-abas), tooltip nos cards do INÍCIO, histórico em Commodities.
- [ ] **Step 4:** Versão `0.3.0` em `package.json`, `tauri.conf.json`, `Cargo.toml`; `npm run tauri build`; commit `chore: versão 0.3.0`.
- [ ] **Step 5:** Atualizar `docs/BACKLOG.md` (remover itens feitos); commit.
