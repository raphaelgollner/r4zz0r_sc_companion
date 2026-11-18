# Fase 3 — FROTA, setup, SALVAGE e abas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a versão 0.4.0 com:
- abas reordenadas, INÍCIO → ROTAS;
- "Copiar destino";
- aba FROTA com janela de setup baseada na Star Citizen Wiki API;
- aba SALVAGE.

**Architecture:**
- A FROTA é uma lista local, num IndexedDB próprio, no mesmo padrão do PROGRESSO. A lista usa só dados do UEX.
- A Wiki entra por um cliente novo que reaproveita o cache (`getResource`), com limitador próprio. Os dados da Wiki são normalizados em tipos pequenos (`WikiPort`, `WikiItem`) e as regras ficam em funções puras de domínio.
- A SALVAGE reaproveita as telas de MINERAÇÃO: Equipment, a janela de loja e o padrão de planner.

**Tech Stack:** Tauri 2, React 19, TypeScript, Vite, Vitest + Testing Library, idb-keyval.

**Spec:** `docs/superpowers/specs/2026-11-18-frota-e-salvage-design.md`

## Global Constraints
- **Idiomas:** interface em PT-BR e EN, com todas as chaves novas em `src/i18n/dict.ts` nas duas línguas. Nomes de produtos (naves, itens, commodities, terminais, locais) e as descrições da Wiki ficam em inglês.
- **Ordem das abas:** ROTAS · TRADE · MINERAÇÃO · SALVAGE · NAVES · FROTA · PROGRESSO · AJUSTES (EN: ROUTES · TRADE · MINING · SALVAGE · SHIPS · FLEET · PROGRESS · SETTINGS).
- **Wiki:**
  - base `https://api.star-citizen.wiki/api/v2`;
  - liga com o UEX só por `uuid`, nunca por nome;
  - TTL de 7 dias;
  - limitador ≤ 60/min.
- **CSP:** `connect-src` ganha `https://api.star-citizen.wiki`. `img-src` não muda.
- **A lista e os totais da FROTA usam só o UEX.** Preço em dólar: `vehicles_prices` com `currency === 'USD'`. O `msrp` da Wiki é fallback só dentro da janela da nave.
- **Encaixes e funções:**
  - Uma função (mining, salvage, tractor) só existe na janela se a nave tiver encaixes desse tipo.
  - Combate nunca aparece.
  - Item exclusivo de nave: `id_vehicle` do UEX, casado por uuid. Se a porta tiver `required_tags`, as tags do item precisam incluí-las.
- **Totais da FROTA:** só o preço base das naves. Naves sem preço ficam fora da soma, com contagem.
- **Versão:** 0.4.0 em `package.json`, `src-tauri/Cargo.toml` e `src-tauri/tauri.conf.json`.

## Review Focus
1. **Wiki fora do ar ou nave sem uuid na Wiki (404):** a lista da FROTA continua normal. A janela mostra erro com "Atualizar" e não quebra. → teste na Task 8.
2. **Trocar o laser por um com menos encaixes de módulo:** os módulos que sobram saem do setup salvo, sem ficarem órfãos. → teste na Task 7.
3. **Nave sem nenhum encaixe industrial (ex.: só combate ou carga):** mostra "Sem setup industrial" e nenhuma build. Mole nunca recebe build de salvage. → teste na Task 7.
4. **FROTA com nave que sumiu do UEX (vehicleId inexistente):** a linha aparece como "nave desconhecida", pode ser removida e não entra nos totais. → teste na Task 5.
5. **Salvage Planner com carga maior que a capacidade ou que a demanda do terminal:** os avisos aparecem e o cálculo não trava. → teste na Task 9.

---

### Task 1: Abas — ROTAS, nova ordem, SALVAGE e FROTA habilitadas

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/i18n/dict.ts` (`tab.home` → "ROTAS"/"ROUTES")
- Modify: `src/app/screens.tsx`
- Test: `src/app/App.test.tsx`

**Interfaces:**
- Produces:
  - `MainTab = 'home' | 'trade' | 'mining' | 'salvage' | 'ships' | 'fleet' | 'progress' | 'settings'`. O id `home` continua, para `#home` seguir funcionando.
  - `SalvageTab = 'materials' | 'planner' | 'equipment' | 'ships'`.
  - `Nav.salvage: SalvageTab`.
  - `Screens.salvage?: Partial<Record<SalvageTab, () => ReactNode>>` e `Screens.fleet?: () => ReactNode`.

- [ ] **Step 1: Escrever os testes que falham** em `App.test.tsx`:
  - `test('abas na ordem nova')`: os nomes de `getAllByRole('tab')` do nível principal são `['ROTAS','TRADE','MINERAÇÃO','SALVAGE','NAVES','FROTA','PROGRESSO','AJUSTES']`.
  - `test('SALVAGE e FROTA habilitadas')`: as duas não estão `disabled`.
  - `test('#salvage/planner abre a subaba')`: com `window.location.hash = '#salvage/planner'` e `screens={{ salvage: { planner: () => <p>PLAN</p> } }}`, aparece `PLAN`.
  - Ajustar os testes antigos que esperam "INÍCIO".
- [ ] **Step 2:** Rodar `npx vitest run src/app/App.test.tsx`. Esperado: FAIL na ordem e nos nomes.
- [ ] **Step 3: Implementar.**
  - `MAIN` na ordem nova.
  - `SALVAGE` e as subabas com rótulos `Materials`, `Salvage Planner`, `Equipment`, `Ships`.
  - `navFromHash` lê `salvage` pela subaba.
  - Renderizar `fleet` e `salvage` como `mining`.
  - A chave do `ErrorBoundary` inclui `nav.salvage`.
- [ ] **Step 4:** Rodar `npx vitest run`. Esperado: todos passam.
- [ ] **Step 5: Commit** `feat: aba ROTAS e nova ordem das abas`

### Task 2: Copiar destino

**Files:**
- Modify: `src/ui/TerminalName.tsx`, `src/ui/theme.css`, `src/i18n/dict.ts`
- Test: `src/ui/terminalName.test.tsx`

**Interfaces:**
- Produces: `TerminalName` ganha um botão `aria-label` = `t('copy.dest', { name })` ("Copiar destino: {name}" / "Copy destination: {name}"). Não muda as props.
- Consumes: `placeName(t)` de `src/domain/location.ts`.

- [ ] **Step 1: Testes que falham.**
  - `test('copia o nome do local')`: com `terminal(5, { space_station_name: 'Port Tressler' })` e `navigator.clipboard.writeText` mockado (`vi.fn().mockResolvedValue(undefined)`), clicar no botão "Copiar destino: Port Tressler" chama `writeText('Port Tressler')` e depois aparece "Copiado".
  - `test('sem local, copia o nome do terminal')`: com `fallback` e terminal sem lugar, copia o `fallback`.
  - `test('falha ao copiar')`: com `writeText` rejeitando, aparece "Não foi possível copiar".
- [ ] **Step 2:** Rodar `npx vitest run src/ui/terminalName.test.tsx`. Esperado: FAIL.
- [ ] **Step 3: Implementar.**
  - Botão pequeno (ícone ⧉, classe `copy-btn`) depois do nome, dentro do mesmo span.
  - O clique faz `stopPropagation`, porque as linhas das tabelas são clicáveis.
  - Estado local de "Copiado" ou erro, que some em 1500 ms.
  - Sem terminal conhecido, o botão copia `fallback`.
- [ ] **Step 4:** Rodar `npx vitest run`. Esperado: todos passam.
- [ ] **Step 5: Commit** `feat: botão copiar destino no nome do terminal`

### Task 3: Dados do UEX — preço em dólar, uuid e item por nave

**Files:**
- Modify: `src/data/types.ts`, `src/data/ttl.ts`
- Create: `src/domain/fleet.ts`
- Test: `src/domain/fleet.test.ts`

**Interfaces:**
- Produces:
  - `Vehicle` ganha `uuid?: string`, `is_tractor_beam?: number`, `is_industrial?: number`.
  - `Item` ganha `uuid?: string | null`, `id_vehicle?: number`, `vehicle_name?: string | null`.
  - `interface PledgePrice { id: number; id_vehicle: number; price: number; currency: string; date_modified: number }`.
  - `UexResource` ganha `'vehicles_prices'`, com `TTL_MS.vehicles_prices = 24 * HOUR`.
  - Em `src/domain/fleet.ts`:
    - `usdPrice(vehicleId: number, prices: PledgePrice[]): number | null`: a linha `USD` com `price > 0`; se houver várias, a de maior `date_modified`.
    - `bestAuec(vehicleId: number, purchases: VehiclePrice[]): VehiclePrice | null`: o menor `price_buy > 0`.
    - `fleetTotals(entries: FleetEntry[], vehicles: Map<number, Vehicle>, pledge: PledgePrice[], purchases: VehiclePrice[]): { count: number; usd: number; auec: number; missingUsd: number; missingAuec: number; unknown: number }`.
    - `shipFunctions(v: Vehicle): ('cargo'|'mining'|'salvage'|'tractor'|'ground')[]`, só para rótulo.

- [ ] **Step 1: Testes que falham** em `fleet.test.ts`:
  - `usdPrice`: ignora `EUR-DE` e `GBP`; entre duas linhas USD, escolhe a mais recente; sem USD → `null`.
  - `bestAuec`: menor preço positivo.
  - `fleetTotals`: duas Prospector (USD 155, aUEC 3 297 600) + uma nave sem preço USD + `vehicleId` 9999 inexistente → `{ count: 4, usd: 310, missingUsd: 1, unknown: 1 }`, e `auec` soma só as que têm preço.
- [ ] **Step 2:** Rodar `npx vitest run src/domain/fleet.test.ts`. Esperado: FAIL, módulo não existe.
- [ ] **Step 3:** Implementar os tipos, o TTL e as funções. `FleetEntry` vem da Task 4; defina o tipo em `src/domain/fleet.ts` e a Task 4 importa de lá.
- [ ] **Step 4:** Rodar `npx vitest run`. Esperado: todos passam.
- [ ] **Step 5: Commit** `feat: preço em dólar e totais da frota`

### Task 4: Armazenamento da FROTA

**Files:**
- Create: `src/store/fleet.tsx`
- Modify: `src/main.tsx` (envolver o app em `FleetProvider`)
- Test: `src/store/fleet.test.tsx`

**Interfaces:**
- Produces:
  - Em `src/domain/fleet.ts`: `interface FleetEntry { id: string; vehicleId: number; nickname: string; note: string; addedAt: number; setup: Record<string, string> }`. `setup` mapeia caminho da porta → uuid do item.
  - `FleetProvider({ store?, children })`.
  - `useFleet(): { entries: FleetEntry[]; ready: boolean; loadFailed: boolean; add(vehicleId): string; update(id, patch: Partial<FleetEntry>): void; remove(id): void }`.
  - `fleetStore(): KVStore`: banco `tayko-companion-fleet` / `fleet`, que "Limpar cache" não apaga.
- Consumes: o padrão de `src/store/progress.tsx` (gravação com 400 ms de atraso, flush em `beforeunload`/`visibilitychange`/unmount, nada gravado se a leitura falhou).

- [ ] **Step 1: Testes que falham** em `fleet.test.tsx`, com `memoryStore()`:
  - `add` duas vezes o mesmo `vehicleId` gera duas entradas com ids diferentes.
  - `update` muda o apelido e grava depois do atraso.
  - `remove` tira a entrada.
  - Store cuja leitura rejeita → `loadFailed` e nada gravado.
  - Dado salvo malformado (sem array) → lista vazia.
- [ ] **Step 2:** Rodar `npx vitest run src/store/fleet.test.tsx`. Esperado: FAIL.
- [ ] **Step 3:** Implementar seguindo `progress.tsx`. Ids com `crypto.randomUUID()`.
- [ ] **Step 4:** Rodar `npx vitest run`. Esperado: todos passam.
- [ ] **Step 5: Commit** `feat: armazenamento local da frota`

### Task 5: Tela FROTA e naves da frota primeiro na ROTAS

**Files:**
- Create: `src/features/fleet/FleetView.tsx`, `src/features/fleet/screens.tsx`
- Modify: `src/app/screens.tsx`, `src/features/trade/RouteControls.tsx`, `src/data/ttl.ts` se preciso, `src/i18n/dict.ts`, `src/ui/theme.css`
- Test: `src/features/fleet/fleet.test.tsx`, `src/features/trade/routeControls.test.tsx`

**Interfaces:**
- Consumes:
  - `useFleet` (Task 4);
  - `fleetTotals`, `usdPrice`, `bestAuec`, `shipFunctions` (Task 3);
  - `StoreDialog` de `src/features/ships/StoreDialog.tsx`;
  - `effectiveScu` e `usePrefs` de `src/store/prefs.ts`.
- Produces:
  - `FleetView({ entries, vehicles, pledge, purchases, rentals, prefs, now, onAdd, onUpdate, onRemove, onOpenSetup })`.
  - `FleetScreen()`, registrado em `screens.fleet`.
  - A Task 8 liga `onOpenSetup(entryId)` à janela de setup. Até lá, `FleetScreen` passa uma função vazia.

- [ ] **Step 1: Testes que falham** em `fleet.test.tsx`:
  - Adicionar "Prospector" pela busca cria uma linha com fabricante, "Mineração", SCU, tripulação, `US$ 155` e `3.297.600 aUEC`.
  - Os totais no topo mostram `2 naves`, `US$ 310` e o aviso "1 sem preço em dólar" quando cabe.
  - Uma entrada com `vehicleId` 9999 aparece como "Nave desconhecida", tem "Remover" e fica fora dos totais (Review Focus 4).
  - Remover pede confirmação; ao confirmar, a linha some.
  - Clicar em "Onde comprar" abre o `StoreDialog` do terminal mais barato.
  - SCU mostrado = `effectiveScu` (com `scuOverrides[id] = 128`, mostra 128).
  - Em `routeControls.test.tsx`: com a frota contendo a nave 7, o `<select>` de nave tem um `<optgroup label="Minhas naves">` com ela antes das demais.
- [ ] **Step 2:** Rodar `npx vitest run src/features/fleet src/features/trade/routeControls.test.tsx`. Esperado: FAIL.
- [ ] **Step 3: Implementar.**
  - `FleetScreen` carrega `vehicles`, `vehicles_prices`, `vehicles_purchases_prices_all` e `vehicles_rentals_prices_all` com `Loaded`.
  - Tabela com `DataTable`.
  - Apelido e nota editáveis em linha.
  - Clicar no nome chama `onOpenSetup`.
  - `RouteControls` usa `useFleet()` e cria o `optgroup`, sem repetir a nave no grupo geral.
- [ ] **Step 4:** Rodar `npx vitest run`. Esperado: todos passam.
- [ ] **Step 5: Commit** `feat: aba FROTA`

### Task 6: Cliente da Star Citizen Wiki

**Files:**
- Create: `src/api/wikiClient.ts`, `src/domain/wiki.ts`, `src/data/useWiki.tsx`
- Modify: `src-tauri/tauri.conf.json` (CSP), `src/data/useUex.tsx` (`clearCache` também limpa o cache da Wiki, se for outro store), `src/data/ttl.ts` (`WIKI_TTL = 7 * 24 * HOUR`)
- Test: `src/api/wikiClient.test.ts`, `src/domain/wiki.test.ts`

**Interfaces:**
- Produces:
  - `fetchWiki<T>(path: string, deps?: UexDeps): Promise<T>`:
    - base `https://api.star-citizen.wiki/api/v2`, devolve `body.data`;
    - erros com `UexError` (`network`, `timeout`, `http_404`, `invalid_json`, `invalid_data`);
    - limitador `createRateLimiter({ maxPerWindow: 60, windowMs: 60_000 })`.
  - `fetchWikiItemsByType(type: string, deps?): Promise<unknown[]>`: percorre `page[number]` com `limit=100` até `links.next === null`.
  - `interface WikiPort { path: string; name: string; type: string; subType: string; minSize: number; maxSize: number; editable: boolean; equippedUuid: string | null; equippedName: string | null; requiredTags: string[]; ports: WikiPort[] }`. `path` é o caminho de nomes do pai até a porta, unido com `/`; ex.: `hardpoint_mining_cab_left/hardpoint_weapon_mining`.
  - `interface WikiVehicle { uuid: string; name: string; role: string | null; description: string | null; msrp: number | null; ports: WikiPort[] }`.
  - `interface WikiItem { uuid: string; name: string; type: string; size: number; manufacturer: string | null; tags: string[]; ports: WikiPort[]; stats: Record<string, number>; active: boolean; charges: number | null }`.
  - `normalizeVehicle(raw: unknown): WikiVehicle` e `normalizeItem(raw: unknown): WikiItem`. Leitura defensiva: campo ausente vira null, `[]` ou `{}`, nunca lança.
  - Regras de `stats`:
    - laser (`mining_laser`): `power_max` = `laser_power.max`, `optimal_range`, `module_slots`, mais cada chave de `modifier_map` (ex.: `laser_instability`, `optimal_charge_window_size`, `resistance`);
    - módulo (`mining_modifier`): `power_modifier`, mais `modifier_map`; `active` = `type === 'Active'`; `charges`;
    - salvage (`weapon_modifier.salvage`): `salvage_speed`, `extraction_efficiency`, `radius`.
  - Hooks em `useWiki.tsx`:
    - `useWikiVehicle(uuid: string | null): UexState<WikiVehicle>`;
    - `useWikiItems(type: string | null): UexState<WikiItem[]>`;
    - ambos usam `getResource` com chave `wiki:vehicle:<uuid>` / `wiki:items:<type>`, TTL 7 dias, e escutam `refreshAll`. Reaproveite o padrão de `useUexBase`; se for preciso, extraia um `useCachedBase(key, fetcher, ttl, enabled)` de `useUex.tsx`.
- Consumes: `getResource`, `createRateLimiter`, `UexError`, `UexDeps`.

- [ ] **Step 1: Testes que falham.**
  - `wikiClient.test.ts`, com `fetchFn` falso:
    - URL `.../vehicles/<uuid>`;
    - 404 → `UexError('http_404')`;
    - corpo sem `data` → `invalid_data`;
    - paginação com duas páginas junta os dados.
  - `wiki.test.ts`, com fixtures JSON pequenas no formato real (copie a estrutura do retorno da Mole/Vulture: `ports[].ports[]`, `sizes.min/max`, `equipped_item.uuid/name`, `required_tags`):
    - `normalizeVehicle` monta os `path` aninhados;
    - `normalizeItem` do Lancet MH2 dá `stats.laser_instability === -10` e `stats.module_slots === 2`;
    - Focus III é passivo com `optimal_charge_window_size: 40`;
    - Abrade dá `salvage_speed: 0.15`;
    - entrada `{}` não lança.
- [ ] **Step 2:** Rodar `npx vitest run src/api/wikiClient.test.ts src/domain/wiki.test.ts`. Esperado: FAIL.
- [ ] **Step 3:** Implementar. Na CSP, acrescentar `https://api.star-citizen.wiki` em `connect-src`.
- [ ] **Step 4:** Rodar `npx vitest run`. Esperado: todos passam.
- [ ] **Step 5: Commit** `feat: cliente da Star Citizen Wiki com cache`

### Task 7: Regras do setup e builds

**Files:**
- Create: `src/domain/setup.ts`
- Test: `src/domain/setup.test.ts`

**Interfaces:**
- Consumes: `WikiPort`, `WikiItem`, `WikiVehicle` (Task 6); `Item` do UEX com `uuid` e `id_vehicle` (Task 3).
- Produces:
  - `type SetupFunction = 'mining' | 'salvage' | 'tractor'`.
  - `SLOT_TYPES: Record<SetupFunction, string[]>` = `{ mining: ['WeaponMining'], salvage: ['SalvageHead'], tractor: ['TractorBeam'] }`.
  - Tipos-filho: `WeaponMining` → `MiningModifier`; `SalvageHead` → `SalvageModifier`.
  - `industrialSlots(v: WikiVehicle): { fn: SetupFunction; port: WikiPort; label: string }[]`:
    - percorre a árvore e devolve as portas editáveis dos tipos de `SLOT_TYPES`;
    - rótulo "Laser 1…n", "Salvage Head 1…n", "Tractor 1…n" pela ordem;
    - portas de outros tipos são ignoradas.
  - `functionsOf(v: WikiVehicle): SetupFunction[]`: as funções que têm pelo menos um slot.
  - `fits(item: WikiItem, port: WikiPort, vehicleUexId: number, uexByUuid: Map<string, Item>): boolean`:
    - tipo igual;
    - `minSize ≤ size ≤ maxSize`;
    - tags exigidas presentes;
    - se o UEX marca `id_vehicle > 0`, só serve para essa nave.
  - `childPorts(port: WikiPort, chosen: WikiItem | null): WikiPort[]`: com item escolhido, as portas de módulo do item; senão, as da porta (as de fábrica).
  - `pruneSetup(setup: Record<string,string>, v: WikiVehicle, items: Map<string, WikiItem>): Record<string,string>`: remove os caminhos que não existem mais com os itens atuais.
  - `interface Build { id: string; fn: SetupFunction; nameKey: string; criterionKey: string; setup: Record<string,string> }`.
  - `buildsFor(v, items: WikiItem[], vehicleUexId, uexByUuid): Build[]`:
    - mining → `stable`, `power`, `balanced`;
    - salvage → `speed`, `efficiency`;
    - tractor → nenhuma.
  - Pontuações (empate: o item de fábrica; depois o nome):
    - `stable`: `-(laser_instability ?? 0) + (optimal_charge_window_size ?? 0)`;
    - `power`: laser `power_max`; módulo `power_modifier`;
    - `balanced`: soma das posições nas duas ordens anteriores, menor vence;
    - `speed`: `salvage_speed`;
    - `efficiency`: `extraction_efficiency`.
  - Módulos ativos só entram se a pontuação for > 0 e a melhor passiva for ≤ 0.
  - `setupCost(setup, uexByUuid: Map<string, Item>, prices: ItemPrice[]): { total: number; missing: number }`.

- [ ] **Step 1: Testes que falham** em `setup.test.ts`, com fixtures Mole, Vulture, uma nave só com armas e lasers/módulos sintéticos:
  - A Mole dá 3 slots `mining`, rótulos Laser 1–3; `functionsOf` = `['mining']`; `buildsFor` não tem build `salvage` (Review Focus 3).
  - A nave só de armas: `functionsOf` = `[]` e `buildsFor` = `[]`.
  - `fits`: laser S2 não cabe em porta 1–1; item com `id_vehicle` de outra nave não cabe; falta de tag exigida não cabe.
  - `stable` escolhe o laser com instabilidade −10 e janela +20 em vez do de instabilidade 0 e janela 0.
  - `power` escolhe o maior `power_max`.
  - Trocar para um laser com 1 encaixe de módulo e rodar `pruneSetup` remove o caminho do segundo módulo (Review Focus 2).
  - `setupCost` soma só os itens com preço e conta os que faltam.
- [ ] **Step 2:** Rodar `npx vitest run src/domain/setup.test.ts`. Esperado: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar `npx vitest run`. Esperado: todos passam.
- [ ] **Step 5: Commit** `feat: regras de encaixes e builds recomendadas`

### Task 8: Janela de setup

**Files:**
- Create: `src/features/fleet/SetupDialog.tsx`
- Modify: `src/features/fleet/screens.tsx`, `src/i18n/dict.ts`, `src/ui/theme.css`
- Test: `src/features/fleet/setup.test.tsx`

**Interfaces:**
- Consumes:
  - `useWikiVehicle`, `useWikiItems` (Task 6);
  - tudo de `src/domain/setup.ts` (Task 7);
  - `useFleet().update` (Task 4);
  - UEX `items` e `items_prices` por categoria: lasers 29, módulos 30, Salvage Beams 110, Scraper Beams 31, Tractor 67 (já em `useUexQuery`).
- Produces: `SetupDialog({ entry, vehicle, onClose })`, aberto por `FleetScreen` em `onOpenSetup`.

- [ ] **Step 1: Testes que falham** em `setup.test.tsx`, com `UexProvider` + `memoryStore` e um `fetchFn` falso que responde UEX e Wiki:
  - A janela da Mole mostra a descrição, o papel "Medium Mining" e 3 linhas de laser com "Arbor MH2" de fábrica.
  - Escolher outro laser num slot grava `entry.setup[path]`.
  - Aplicar a build "Estável" preenche os 3 lasers e mostra o critério escrito.
  - O custo total aparece em aUEC.
  - "Voltar ao de fábrica" limpa o setup.
  - A Wiki respondendo 404: aparece a mensagem de erro com "Atualizar", e a lista da FROTA continua na tela (Review Focus 1).
  - A nave só de armas mostra "Sem setup industrial para esta nave".
  - O `msrp` da Wiki aparece como preço de referência quando o UEX não tem USD.
- [ ] **Step 2:** Rodar `npx vitest run src/features/fleet/setup.test.tsx`. Esperado: FAIL.
- [ ] **Step 3: Implementar.**
  - Usar `Dialog`.
  - Um `<select>` por slot com os itens que cabem (`fits`) e os principais `stats` no texto da opção.
  - Abaixo do laser, os selects de módulo (`childPorts`).
  - Cada mudança passa por `pruneSetup` antes de `update`.
  - Mostrar preço e "onde comprar" do item escolhido (`ItemStoreDialog`).
- [ ] **Step 4:** Rodar `npx vitest run`. Esperado: todos passam.
- [ ] **Step 5: Commit** `feat: janela de setup da nave`

### Task 9: SALVAGE — Materials e Salvage Planner

**Files:**
- Create: `src/domain/salvage.ts`, `src/features/salvage/MaterialsView.tsx`, `src/features/salvage/SalvagePlannerView.tsx`, `src/features/salvage/screens.tsx`, `src/store/salvagePrefs.ts`
- Modify: `src/app/screens.tsx`, `src/i18n/dict.ts`
- Test: `src/domain/salvage.test.ts`, `src/features/salvage/salvage.test.tsx`

**Interfaces:**
- Produces:
  - `SALVAGE_CODES = ['RMC', 'CMAT', 'SCRA', 'WAST']`.
  - `salvageMaterials(commodities: Commodity[]): Commodity[]`: casa pelo `code`.
  - `interface SalvageLine { commodityId: number; scu: number }`.
  - `salvagePlan(cargo: SalvageLine[], prices: PriceRow[], distance: (terminalId) => number | null, sortBy: 'value' | 'distance'): SalvagePlanRow[]`. Por terminal que compra pelo menos um material da carga: `value` = Σ scu × price_sell; `short: number[]` = materiais com demanda (`scu_sell`) menor que a carga; `missing: number[]` = materiais que o terminal não compra; `distance`.
  - `capacityWarning(cargo, scu): boolean`.
  - `useSalvagePrefs()`: em localStorage, `{ shipId, locationId, cargo, sortBy }`, no padrão de `src/store/minerPrefs.ts`.
- Consumes:
  - `DistanceFetcher` e `distancesFor` (MINERAÇÃO);
  - `HistoryPanel` e a tabela de Commodities (TRADE);
  - `useFleet` para listar primeiro as naves de salvage da frota;
  - `effectiveScu`.

- [ ] **Step 1: Testes que falham.**
  - `salvage.test.ts`:
    - `salvagePlan` com RMC 10 SCU + CMAT 5 SCU em dois terminais (um compra os dois, outro só RMC) → ordenado por valor e `missing` correto;
    - terminal com `scu_sell: 4` para RMC 10 → `short` contém RMC;
    - `capacityWarning([{scu: 20}], 12)` → `true` (Review Focus 5).
  - `salvage.test.tsx`:
    - Materials lista os 4 materiais com melhor venda;
    - o Planner com uma Vulture (12 SCU) e carga 20 mostra o aviso de capacidade;
    - SCU com vírgula ("3,5") é aceito.
- [ ] **Step 2:** Rodar `npx vitest run src/domain/salvage.test.ts src/features/salvage`. Esperado: FAIL.
- [ ] **Step 3:** Implementar. Reaproveite o `ScuInput` e o `SearchPicker` de `PlannerView.tsx`, movendo-os para `src/ui/` em vez de copiar.
- [ ] **Step 4:** Rodar `npx vitest run`. Esperado: todos passam.
- [ ] **Step 5: Commit** `feat: SALVAGE — Materials e Salvage Planner`

### Task 10: SALVAGE — Equipment e Ships

**Files:**
- Modify: `src/features/mining/EquipmentView.tsx` (as categorias passam a ser uma prop, com as abas atuais como padrão), `src/features/salvage/screens.tsx`, `src/app/screens.tsx`, `src/i18n/dict.ts`
- Create: `src/features/salvage/SalvageShipsView.tsx`
- Test: `src/features/salvage/salvageEquipment.test.tsx`

**Interfaces:**
- Consumes: `EquipmentView`, `ItemStoreDialog`, `StoreDialog`, `bestAuec`.
- Produces:
  - `EquipmentView` aceita `kinds: { key: string; label: string; category: number; columns: string[] }[]`.
  - MINERAÇÃO passa as atuais: lasers 29, módulos 30, gadgets 28.
  - SALVAGE passa: `scraper` 31 "Scraper Beams", `tractor` 67 "Tractor Beams", `salvage` 110 "Salvage Beams". As colunas são os atributos que aparecem nos dados dessas categorias.
  - `SalvageShipsView({ vehicles, purchases, rentals, now })`: naves com `is_salvage`.

- [ ] **Step 1: Testes que falham.**
  - A Equipment de SALVAGE mostra as abas Scraper Beams, Tractor Beams e Salvage Beams; trocar de aba muda a categoria buscada.
  - Ships lista Vulture e Reclaimer com o menor preço em aUEC; clicar na loja abre o `StoreDialog`.
  - Os testes atuais de `equipment.test.tsx` continuam passando.
- [ ] **Step 2:** Rodar `npx vitest run src/features/salvage src/features/mining`. Esperado: FAIL nos novos.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar `npx vitest run`. Esperado: todos passam.
- [ ] **Step 5: Commit** `feat: SALVAGE — Equipment e Ships`

### Task 11: Versão 0.4.0, backlog e instalador

**Files:**
- Modify: `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `docs/BACKLOG.md`

- [ ] **Step 1:** Versão 0.4.0 nos três arquivos.
- [ ] **Step 2:** Atualizar o `BACKLOG.md`:
  - mover os itens da Fase 3 para "Feito na versão 0.4.0";
  - tirar "Ideias em avaliação" (o macro foi descartado);
  - manter a Fase 4.
- [ ] **Step 3:** Rodar `npx vitest run` e `npx tsc --noEmit`. Esperado: todos passam e nenhum erro de tipo.
- [ ] **Step 4:** Rodar `npx tauri build`. Esperado: gera `src-tauri/target/release/bundle/nsis/Tayko Corp Companion_0.4.0_x64-setup.exe`.
- [ ] **Step 5:** Abrir o exe com depuração remota do WebView2 (`appcheck.mjs`, como na 0.3.0). Conferir:
  - FROTA → setup da Mole carrega da Wiki sem erro de CSP no console;
  - SALVAGE → Materials carrega.
- [ ] **Step 6: Commit** `chore: versão 0.4.0`
