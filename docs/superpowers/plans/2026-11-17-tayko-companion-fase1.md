# Tayko Corp Companion — Fase 1 (Fundação + TRADE) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App Windows (Tauri) com a marca Tayko, cache local dos dados do UEX e a aba TRADE completa (Commodities, Locations, Harvestables, Price Finder, Routes, Currencies Index) mais HOME e SETTINGS.

**Architecture:** Tauri 2 só como janela; toda a lógica em React + TypeScript. Dados vêm de `https://api.uexcorp.uk/2.0` (CORS aberto), passam por um limitador (≤100 req/min) e por um cache em IndexedDB com TTL por recurso. Regras de negócio (rotas, frescor, busca de preço, árvore de locais) ficam em funções puras em `src/domain/` com testes; as telas são "views" que recebem dados por props, ligadas aos dados por um hook.

**Tech Stack:** Tauri 2, React 18, TypeScript, Vite, Vitest + @testing-library/react + jsdom, idb-keyval, @fontsource/orbitron, @fontsource/exo-2.

**Spec:** `docs/superpowers/specs/2026-11-17-tayko-companion-design.md`

## Global Constraints

- Raiz do projeto: `E:\PROJETOS\TaykoCorpCompanion`. Logo original: `file_00000000ec2c720e95998fae1a1060a0.png` (fundo branco).
- Só dados do UEX; nada inventado ou digitado à mão (§3.1). Sem login, sem token.
- Base da API: `https://api.uexcorp.uk/2.0/{recurso}/`; resposta `{ status: "ok", data }`. Datas `date_modified` em **segundos** Unix.
- Limite: no máximo 100 requisições por 60 s (UEX permite 120).
- TTL: `commodities` 1 h; `commodities_prices_all` 30 min; `commodities_status`, `vehicles`, `terminals`, `planets`, `moons`, `currencies_index_history` 12 h; `currencies_index` 1 h.
- Frescor: "envelhecendo" (laranja) após 24 h (configurável), "velho" (vermelho) após 7 dias (configurável).
- Título da janela e do app: `TAYKO CORP COMPANION`. Interface em **pt-BR e en** (padrão pt-BR), todo texto via `t()`. **Nunca traduzir nomes de produtos** (commodities, naves, fabricantes, terminais, locais): vêm do UEX como estão. Abas principais — pt: INÍCIO, TRADE, NAVES, MINERAÇÃO, SALVAGE, FROTA, AJUSTES; en: HOME, TRADE, SHIPS, MINING, SALVAGE, FLEET, SETTINGS. Sub-abas de TRADE com os nomes do UEX nos dois idiomas.
- Crédito visível: "Dados: UEX Corp" e "Star Citizen® é marca registrada da Cloud Imperium Games. App não oficial."
- Tokens visuais: `--gold #F4C430`, `--gold-light #FFD700`, `--gold-dark #C9A22B`, `--orange #FF8C00`, `--accent #FF6B00`, `--black #0A0A0F`, `--dark-gray #1A1A1A`, `--mid-gray #2A2A2A`, `--light-gray #3A3A3A`, `--white #E8E8E8`, `--glow-gold rgba(244,196,48,.5)`, `--profit #3DDC84`, `--danger #FF4D4D`. Fontes Orbitron (títulos, caixa alta) e Exo 2 (texto), embutidas. Chanfro: `clip-path: polygon(0 0, 90% 0, 100% 10%, 100% 100%, 10% 100%, 0 90%)` (em painéis largos usar valores em px: `polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))`). Rótulos de seção `// NOME`.
- Números em pt-BR (`1.200.000`), com `tabular-nums`.
- Janela: 1400×900, mínimo 1100×700.

## Review Focus

1. **Primeira abertura sem internet / UEX fora do ar, sem cache** → a tela mostra "Não foi possível carregar os dados do UEX" com botão "Tentar de novo", nunca fica em branco nem quebra. (teste na Task 3)
2. **Orçamento vazio, 0 ou negativo, ou nave com 0 SCU** → nenhuma rota, mensagem explicando o motivo, nunca `NaN`/`Infinity` na tela. (teste na Task 5)
3. **Preço com `date_modified` 0 ou nulo** → idade "desconhecida", tratado como velho. (teste na Task 4)
4. **UEX responde `status` diferente de `ok` (ex.: `requests_limit_reached`) com cache existente** → continua mostrando o cache e avisa o erro. (teste na Task 3)
5. **Estoque de origem desconhecido (`scu_buy` e `scu_buy_avg` = 0)** → não limita a quantidade, mostra "estoque desconhecido" (mesma regra da demanda). (teste na Task 5)

---

### Task 1: Pré-requisitos, projeto Tauri e logo

**Files:**
- Create: projeto Vite React-TS na raiz, `src-tauri/` (via `tauri init`), `scripts/make-logo.py`, `src/assets/logo.png`, `.gitignore`, `vitest.config.ts`, `src/test/setup.ts`, `src/smoke.test.ts`
- Modify: `package.json` (scripts `dev`, `build`, `test`, `tauri`), `src-tauri/tauri.conf.json`

**Interfaces:**
- Produces: `npm test` (vitest run), `npm run tauri dev`, `src/assets/logo.png` (fundo transparente), ícones em `src-tauri/icons/`.

- [ ] **Step 1: Instalar Rust** — pedir autorização ao usuário antes. Rodar `winget install --id Rustlang.Rustup -e` e depois `rustup default stable-msvc`. MSVC 14.44 (VS 2022) e WebView2 já estão instalados.
  Verificar: `cargo -V` imprime versão.
- [ ] **Step 2: `git init`** na raiz, branch `main`. `.gitignore`: `node_modules/`, `dist/`, `src-tauri/target/`, `*.log`.
- [ ] **Step 3: Scaffold** — `npm create vite@latest .scaffold -- --template react-ts`, mover o conteúdo de `.scaffold/` para a raiz (sem sobrescrever `docs/` nem a logo), apagar `.scaffold/`, `npm install`. Remover o conteúdo de exemplo do Vite (App.css, logos react/vite).
- [ ] **Step 4: Dependências** — `npm i idb-keyval @fontsource/orbitron @fontsource/exo-2 @tauri-apps/api@^2` e `npm i -D @tauri-apps/cli@^2 vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event`.
- [ ] **Step 5: Tauri** — `npx tauri init --ci --app-name tayko-corp-companion --window-title "TAYKO CORP COMPANION" --frontend-dist ../dist --dev-url http://localhost:5173 --before-dev-command "npm run dev" --before-build-command "npm run build"`. Em `tauri.conf.json`: `identifier` `org.tayko.companion`, `productName` `Tayko Corp Companion`, janela `width 1400, height 900, minWidth 1100, minHeight 700`, `bundle.targets` `["nsis"]`.
- [ ] **Step 6: Logo transparente** — `scripts/make-logo.py` (Pillow): abre a logo original, pixels com R,G,B ≥ 245 viram alfa 0, faixa 225–244 vira alfa proporcional (borda suave), corta as bordas vazias (`getbbox`), salva `src/assets/logo.png`. Rodar `python -I scripts/make-logo.py`. Gerar ícones: `npx tauri icon src/assets/logo.png`.
  Verificar: abrir `src/assets/logo.png` e conferir que o fundo está transparente e as bordas não ficaram serrilhadas.
- [ ] **Step 7: Vitest** — `vitest.config.ts` com `environment: 'jsdom'`, `setupFiles: ['src/test/setup.ts']` (importa `@testing-library/jest-dom/vitest`). `src/smoke.test.ts`: `expect(1 + 1).toBe(2)`. Script `"test": "vitest run"`.
  Run: `npm test` → Expected: 1 passed.
- [ ] **Step 8: Abrir a janela** — Run: `npm run tauri dev` → janela "TAYKO CORP COMPANION" abre (primeira compilação Rust demora alguns minutos). Fechar.
- [ ] **Step 9: Commit** — `git add -A && git commit -m "chore: scaffold Tauri + React app com logo Tayko"`

### Task 2: Cliente da API e limitador

**Files:**
- Create: `src/api/rateLimiter.ts`, `src/api/uexClient.ts`, `src/api/rateLimiter.test.ts`, `src/api/uexClient.test.ts`

**Interfaces:**
- Produces:
  - `createRateLimiter(opts: { maxPerWindow: number; windowMs: number; now?: () => number; sleep?: (ms: number) => Promise<void> }): RateLimiter` com `schedule<T>(fn: () => Promise<T>): Promise<T>`
  - `UEX_BASE = 'https://api.uexcorp.uk/2.0'`
  - `class UexError extends Error { code: string }` (`code` = `status` da API, ou `http_<n>`, ou `network`)
  - `fetchUex<T>(resource: string, params?: Record<string, string | number>, deps?: { fetchFn?: typeof fetch; limiter?: RateLimiter }): Promise<T>` → devolve `data`. Limiter padrão: `{ maxPerWindow: 100, windowMs: 60_000 }`, compartilhado.

- [ ] **Step 1: Testes que falham**
  - `rateLimiter.test.ts › 'executa até o limite sem esperar'`: maxPerWindow 3, 3 chamadas → `sleep` nunca chamado.
  - `› 'a 4ª chamada espera o fim da janela'`: relógio falso em 0, maxPerWindow 3, windowMs 60000 → `sleep` chamado com `60000`.
  - `uexClient.test.ts › 'monta URL com parâmetros'`: `fetchUex('commodities_prices', { id_commodity: 47 }, { fetchFn })` → `fetchFn` recebe `https://api.uexcorp.uk/2.0/commodities_prices/?id_commodity=47`; retorna o `data` do JSON.
  - `› 'status diferente de ok lança UexError com code'`: JSON `{status:'requests_limit_reached'}` → rejeita com `code === 'requests_limit_reached'`.
  - `› 'HTTP 500 lança UexError http_500'` e `› 'falha de rede lança UexError network'`.
- [ ] **Step 2:** `npx vitest run src/api` → FAIL (módulos não existem).
- [ ] **Step 3:** Implementar. Limitador: janela deslizante com os timestamps das últimas `maxPerWindow` chamadas; se cheia, `sleep(oldest + windowMs - now())`.
- [ ] **Step 4:** `npx vitest run src/api` → PASS.
- [ ] **Step 5:** Commit `feat: cliente da API UEX com limitador`.

### Task 3: Cache local e hook de dados

**Files:**
- Create: `src/data/types.ts`, `src/data/ttl.ts`, `src/cache/store.ts`, `src/cache/cachedResource.ts`, `src/cache/cachedResource.test.ts`, `src/data/useUex.ts`, `src/data/useUex.test.tsx`

**Interfaces:**
- Consumes: `fetchUex`, `UexError` (Task 2).
- Produces:
  - `types.ts`: `Commodity` (campos de `commodities` usados: `id, name, code, kind, price_buy, price_sell, is_illegal, is_harvestable, is_raw, is_refined, is_buyable, is_sellable, ids_planets, ids_moons, date_modified`), `PriceRow` (linha de `commodities_prices_all`: `id, id_commodity, id_terminal, price_buy, price_buy_avg, price_sell, price_sell_avg, scu_buy, scu_buy_avg, scu_sell_stock, scu_sell, scu_sell_avg, status_buy, status_sell, date_modified, commodity_name, terminal_name`), `StatusLevel` (`code, name, name_short, colors`), `CommodityStatus = { buy: StatusLevel[]; sell: StatusLevel[] }`, `Vehicle` (`id, name, name_full, scu, is_cargo, is_mining, is_salvage, is_ground_vehicle`), `Terminal` (`id, name, displayname, type, star_system_name, planet_name, moon_name, space_station_name, city_name, outpost_name`), `Planet`/`Moon` (`id, name`), `CurrencyIndex` (`currency, index_value, basket_value, date_modified, components: { id_commodity, commodity_name, weight, avg_price, base_price }[]`), `CurrencyIndexPoint` (`index_value, date_added`).
  - `ttl.ts`: `TTL_MS: Record<UexResource, number>` com os valores das Global Constraints; `type UexResource = 'commodities' | 'commodities_prices_all' | 'commodities_status' | 'vehicles' | 'terminals' | 'planets' | 'moons' | 'currencies_index' | 'currencies_index_history'`.
  - `store.ts`: `interface KVStore { get(key: string): Promise<unknown>; set(key: string, v: unknown): Promise<void>; clear(): Promise<void> }`, `memoryStore(): KVStore`, `idbStore(): KVStore` (idb-keyval).
  - `cachedResource.ts`: `interface CacheResult<T> { data: T; fetchedAt: number; fromCache: boolean; error?: string }`; `peekResource<T>(key, store): Promise<CacheResult<T> | null>`; `getResource<T>(key: string, ttlMs: number, fetcher: () => Promise<T>, store: KVStore, now?: () => number, force?: boolean): Promise<CacheResult<T>>`.
  - `useUex.ts`: `useUex<T>(resource: UexResource): { data: T | null; fetchedAt: number | null; loading: boolean; error: string | null; refresh: () => void }` — primeiro mostra o `peekResource`, depois chama `getResource`; `refresh` usa `force: true`. Store padrão `idbStore()`, trocável por `UexProvider value={{ store, fetchFn }}` (contexto) para testes. `clearCache(): Promise<void>`.

- [ ] **Step 1: Testes que falham** (`cachedResource.test.ts`, com `memoryStore` e relógio falso)
  - `'cache válido não chama a API'`: grava em t=0, TTL 1000, lê em t=500 → fetcher não chamado, `fromCache: true`.
  - `'cache vencido busca de novo e grava'`: lê em t=1500 → fetcher chamado, `fromCache: false`, `fetchedAt: 1500`.
  - `'force ignora TTL'`.
  - `'falha com cache existente devolve cache + error'` (Review Focus 4): fetcher rejeita `UexError('requests_limit_reached')` → devolve dado antigo, `error: 'requests_limit_reached'`.
  - `'falha sem cache rejeita'`.
  - `useUex.test.tsx › 'sem cache e sem rede mostra erro'` (Review Focus 1): fetchFn rejeita → `error` preenchido, `data` null, `loading` false.
- [ ] **Step 2:** `npx vitest run src/cache src/data` → FAIL.
- [ ] **Step 3:** Implementar. Chave do cache = nome do recurso. Valor gravado: `{ data, fetchedAt }`.
- [ ] **Step 4:** `npx vitest run src/cache src/data` → PASS.
- [ ] **Step 5:** Commit `feat: cache local com TTL e hook useUex`.

### Task 4: Frescor e formatação

**Files:**
- Create: `src/domain/freshness.ts`, `src/domain/format.ts`, `src/domain/freshness.test.ts`, `src/domain/format.test.ts`

**Interfaces:**
- Produces:
  - `type AgeLevel = 'fresh' | 'aging' | 'stale' | 'unknown'`
  - `ageLevel(dateModifiedSec: number | null | undefined, nowMs: number, warnHours = 24, staleDays = 7): AgeLevel`
  - `formatAge(dateModifiedSec: number | null | undefined, nowMs: number): string`
  - `formatAuec(n: number): string`, `formatScu(n: number): string` (ex.: `"576 SCU"`), `formatPercent(n: number): string` (1 casa: `"16,4%"`)

- [ ] **Step 1: Testes que falham** (now = `1_800_000_000_000`)
  - `ageLevel(now/1000 - 3600, now)` → `'fresh'`; `- 25*3600` → `'aging'`; `- 8*86400` → `'stale'`; `0` e `null` → `'unknown'` (Review Focus 3).
  - `formatAge`: 30 s → `"agora"`; 5 min → `"há 5 min"`; 3 h → `"há 3 h"`; 3 dias → `"há 3 dias"`; `null` → `"data desconhecida"`.
  - `formatAuec(1200000)` → `"1.200.000"`; `formatAuec(15782.4)` → `"15.782"`; `formatPercent(16.43)` → `"16,4%"`.
- [ ] **Step 2:** `npx vitest run src/domain` → FAIL.
- [ ] **Step 3:** Implementar com `Intl.NumberFormat('pt-BR')`. Em `ageLevel`, `unknown` conta como velho na interface (cor vermelha).
- [ ] **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat: frescor e formatação pt-BR`.

### Task 5: Calculadora de rotas e Price Finder (regras)

**Files:**
- Create: `src/domain/routes.ts`, `src/domain/routes.test.ts`, `src/domain/priceFinder.ts`, `src/domain/priceFinder.test.ts`

**Interfaces:**
- Consumes: `PriceRow`, `Commodity`, `Terminal` (Task 3).
- Produces:
  - `type LimitedBy = 'nave' | 'dinheiro' | 'estoque' | 'demanda'`
  - `interface RouteInput { shipScu: number; budget: number; excludeIllegal: boolean; originSystem?: string; sortBy: 'profit' | 'roi' }`
  - `interface RouteOption { commodityId: number; commodityName: string; buy: PriceRow; sell: PriceRow; qty: number; limitedBy: LimitedBy; stockKnown: boolean; demandKnown: boolean; cost: number; revenue: number; profit: number; roi: number }`
  - `type RouteResult = { ok: true; routes: RouteOption[] } | { ok: false; reason: 'nave_sem_carga' | 'sem_orcamento' }`
  - `computeRoutes(prices: PriceRow[], commodities: Commodity[], terminals: Map<number, Terminal>, input: RouteInput, limit = 50): RouteResult`
  - `bestPlaces(prices: PriceRow[], commodityId: number, side: 'buy' | 'sell', limit = 10): PriceRow[]`

Regras (do spec §7.1):
- Compra = linhas com `price_buy > 0`; venda = linhas com `price_sell > 0`; mesma commodity; terminais diferentes.
- Estoque = `scu_buy > 0 ? scu_buy : scu_buy_avg`; 0 → desconhecido (não limita). Demanda = `scu_sell > 0 ? scu_sell : scu_sell_avg`; 0 → desconhecida (não limita).
- `qty = floor(min(shipScu, budget / price_buy, estoque?, demanda?))`. `limitedBy` = o primeiro, na ordem nave, dinheiro, estoque, demanda, cujo valor é igual ao mínimo.
- Descarta `qty <= 0` e `profit <= 0`. `roi = profit / cost * 100`.
- `originSystem` filtra pelo `star_system_name` do terminal de compra.

- [ ] **Step 1: Testes que falham** (`routes.test.ts`, fixtures pequenas montadas no teste; Laranite id 47, compra no terminal 8 a 7047 com `scu_buy 434`, venda no terminal 12 a 8500 com `scu_sell 1000`)
  - `'limitado pelo estoque'`: nave 576, orçamento 1.200.000 → `qty 434`, `limitedBy 'estoque'`, `cost 3058398`, `profit 630602`.
  - `'limitado pelo dinheiro'`: orçamento 100.000 → `qty 14`, `'dinheiro'`.
  - `'limitado pela nave'`: nave 100 → `qty 100`, `'nave'`.
  - `'limitado pela demanda'`: `scu_sell 300` → `qty 300`, `'demanda'`.
  - `'demanda desconhecida não limita'`: `scu_sell 0, scu_sell_avg 0` → `qty 434`, `demandKnown false`.
  - `'estoque desconhecido não limita'` (Review Focus 5): `scu_buy 0, scu_buy_avg 0`, nave 576 → `qty 141` (1.000.000/7047 com orçamento 1.000.000), `stockKnown false`.
  - `'usa scu_sell_avg quando scu_sell é 0'`: `scu_sell 0, scu_sell_avg 200` → `qty 200`, `'demanda'`.
  - `'exclui ilegais'`, `'ignora mesmo terminal'`, `'ignora lucro <= 0'`, `'ordena por lucro e por roi'`, `'filtra sistema de origem'`.
  - `'orçamento 0, vazio ou negativo'` (Review Focus 2): `budget 0` e `-5` e `NaN` → `{ ok: false, reason: 'sem_orcamento' }`; `shipScu 0` → `'nave_sem_carga'`.
  - `priceFinder.test.ts`: `bestPlaces(..., 'buy')` ordena `price_buy` crescente e ignora `price_buy 0`; `'sell'` ordena `price_sell` decrescente; respeita `limit`.
- [ ] **Step 2:** `npx vitest run src/domain` → FAIL.
- [ ] **Step 3:** Implementar. Agrupar preços por `id_commodity` antes de cruzar compra × venda (evita O(n²) global).
- [ ] **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat: regras da calculadora de rotas e price finder`.

### Task 6: Árvore de locais e "onde aparece"

**Files:**
- Create: `src/domain/locations.ts`, `src/domain/locations.test.ts`

**Interfaces:**
- Consumes: `Terminal`, `Commodity`, `Planet`, `Moon`.
- Produces:
  - `interface LocationNode { label: string; children: LocationNode[]; terminals: Terminal[] }`
  - `buildLocationTree(terminals: Terminal[], types?: string[]): LocationNode[]` — nível 1 `star_system_name`, nível 2 `planet_name` (vazio → `"Espaço profundo"`), nível 3 primeiro não-vazio entre `moon_name`, `space_station_name`, `city_name`, `outpost_name` (nenhum → terminais direto no planeta). Ordenação alfabética pt-BR. `types` padrão `['commodity', 'commodity_raw']`.
  - `whereFound(c: Commodity, planets: Map<number, Planet>, moons: Map<number, Moon>): string[]` — nomes de planetas e luas a partir de `ids_planets`/`ids_moons` (texto separado por vírgula, pode ser `null` ou `""`), ignorando IDs sem nome, sem repetição, ordenado.

- [ ] **Step 1: Testes que falham**: árvore com 2 sistemas e terminal sem planeta → nó `"Espaço profundo"`; terminal em lua agrupado sob a lua; filtro por `types` exclui `type: 'item'`; `whereFound` com `"4,242"` e `"1,2"` → nomes; com `null` → `[]`; ID desconhecido ignorado.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat: árvore de locais e onde aparece`.

### Task 7: Tema, componentes base e casca do app

**Files:**
- Create: `src/i18n/dict.ts`, `src/i18n/i18n.tsx`, `src/i18n/i18n.test.tsx`, `src/ui/theme.css`, `src/ui/fonts.ts`, `src/ui/Panel.tsx`, `src/ui/SectionLabel.tsx`, `src/ui/Tabs.tsx`, `src/ui/DataTable.tsx`, `src/ui/FreshnessBadge.tsx`, `src/ui/StatusBadge.tsx`, `src/ui/LoadState.tsx`, `src/app/App.tsx`, `src/app/Header.tsx`, `src/app/Footer.tsx`, `src/app/App.test.tsx`
- Modify: `src/main.tsx`, `index.html` (`lang="pt-BR"`, título)

**Interfaces:**
- Consumes: `useUex`, `formatAge`, `ageLevel`.
- Produces:
  - i18n: `type Lang = 'pt' | 'en'`; `dict.ts` exporta `pt` e `en` com as mesmas chaves (`en: Record<keyof typeof pt, string>`, o compilador acusa chave faltando); `I18nProvider({ initial?: Lang, children })`; `useI18n(): { lang: Lang; setLang(l: Lang): void; t(key: keyof typeof pt, vars?: Record<string, string | number>): string }` com interpolação `{nome}`; idioma salvo em localStorage `tayko.lang` (try/catch). `formatAge` recebe `lang` opcional (en: "now", "5 min ago", "3 h ago", "3 days ago", "unknown date"). Números continuam em formato pt-BR nos dois idiomas *(decisão: é o formato do usuário)*.
  - `Panel({ title?, children, glow? })` — chanfrado, borda `--light-gray`, título em Orbitron.
  - `SectionLabel({ children })` → `// TEXTO` em `--gold`, caixa alta, `letter-spacing: .2em`.
  - `Tabs<K extends string>({ items: { key: K; label: string; disabled?: boolean; hint?: string }[]; active: K; onChange(k: K) })`
  - `DataTable<R>({ rows: R[]; columns: { key: string; header: string; render(r: R): ReactNode; sortValue?(r: R): number | string; align?: 'left' | 'right' }[]; initialSort?: { key: string; dir: 'asc' | 'desc' }; onRowClick?(r: R); empty?: string })` — clique no cabeçalho ordena.
  - `FreshnessBadge({ dateModifiedSec, now, warnHours?, staleDays? })` — texto de `formatAge`, cor por `ageLevel`.
  - `StatusBadge({ code, levels: StatusLevel[] })` — `name_short` com cor de `colors`.
  - `LoadState({ loading, error, onRetry, children })` — erro mostra "Não foi possível carregar os dados do UEX" + botão "Tentar de novo"; com dados e erro mostra faixa de aviso acima do conteúdo.
  - `App` — Header (logo + `TAYKO CORP COMPANION` em Orbitron dourado com brilho), abas principais `HOME | TRADE | MINING | SALVAGE | FLEET | SETTINGS` (MINING, SALVAGE, FLEET desabilitadas com dica "Fase 2"/"Fase 3"), sub-abas de TRADE: `Commodities | Locations | Harvestables | Price Finder | Routes | Currencies Index`. Footer: "Dados: UEX Corp · atualizado {formatAge}" + aviso CIG das Global Constraints. Estado de navegação em `useState`, sem router.

- [ ] **Step 1: Testes que falham** (`App.test.tsx`, com `UexProvider` usando `memoryStore` e `fetchFn` falso): mostra o título `TAYKO CORP COMPANION`; clicar em TRADE mostra as 6 sub-abas; MINERAÇÃO está desabilitada; footer contém "Dados: UEX Corp"; botão de idioma troca para EN e a aba vira "SHIPS" e o footer "Data: UEX Corp". `i18n.test.tsx`: `t` com interpolação; idioma salvo e restaurado; `formatAge(..., 'en')`.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. `theme.css` define os tokens no `:root`, `body` com fundo `--black` e grade sutil (`background-image` com linhas `--dark-gray` a cada 40px), scrollbar escura. **Step 4:** PASS.
- [ ] **Step 5:** Verificação visual: `npm run tauri dev` → fundo escuro, logo transparente sem halo branco, títulos em Orbitron, abas funcionando.
- [ ] **Step 6:** Commit `feat: tema Tayko e casca do app`.

### Task 8: TRADE › Commodities e Price Finder

**Files:**
- Create: `src/features/trade/CommoditiesView.tsx`, `src/features/trade/CommoditiesScreen.tsx`, `src/features/trade/PriceFinderView.tsx`, `src/features/trade/PriceFinderScreen.tsx`, `src/features/trade/CommodityPicker.tsx`, `src/features/trade/trade.test.tsx`

**Interfaces:**
- Consumes: `useUex`, `DataTable`, `FreshnessBadge`, `StatusBadge`, `LoadState`, `bestPlaces`, `formatAuec`.
- Produces: `CommodityPicker({ commodities, value: number | null, onChange(id) })` (campo de busca com lista filtrada por nome/código, usado também na Task 9). Views recebem `{ commodities, prices, status, now }` por props; Screens ligam `useUex`.

- [ ] **Step 1: Testes que falham** (views com fixtures):
  - Commodities: lista mostra nome, código, preço médio de compra e de venda; busca "lara" filtra para Laranite; clicar abre o detalhe com uma linha por terminal: Terminal, Compra, Estoque, Venda, Demanda, Status, Atualizado.
  - Price Finder: escolher Laranite + "Onde vender" mostra terminais ordenados do maior para o menor preço; "Onde comprar" do menor para o maior; commodity sem preço mostra "Nenhum terminal com preço registrado".
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat: TRADE commodities e price finder`.

### Task 9: TRADE › Locations, Harvestables e Currencies Index

**Files:**
- Create: `src/features/trade/LocationsView.tsx`, `LocationsScreen.tsx`, `HarvestablesView.tsx`, `HarvestablesScreen.tsx`, `CurrenciesView.tsx`, `CurrenciesScreen.tsx`, `src/ui/Sparkline.tsx`, `src/features/trade/trade2.test.tsx`

**Interfaces:**
- Consumes: `buildLocationTree`, `whereFound`, `bestPlaces`, `useUex`, `DataTable`.
- Produces: `Sparkline({ points: number[]; width?: number; height?: number })` — SVG linha `--gold`.

- [ ] **Step 1: Testes que falham**:
  - Locations: árvore expansível sistema → planeta → lua/estação → terminal; clicar num terminal lista as commodities negociadas lá (compra/venda, estoque, atualizado).
  - Harvestables: lista só `is_harvestable = 1` (Hadanite aparece, Laranite não), com colunas Melhor venda (terminal + preço), Onde aparece (`whereFound`), Atualizado.
  - Currencies: mostra `index_value` atual com 2 casas, tabela dos componentes (Commodity, Peso %, Preço médio, Preço base) e o `Sparkline` com os pontos de `currencies_index_history` em ordem de `date_added`. Texto explicativo: "Índice de preços de uma cesta de commodities (base dez/2023 = 100). Não é câmbio."
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat: TRADE locations, harvestables e currencies index`.

### Task 10: TRADE › Routes e HOME

**Files:**
- Create: `src/store/prefs.ts`, `src/store/prefs.test.ts`, `src/features/trade/RoutesView.tsx`, `RoutesScreen.tsx`, `RouteCard.tsx`, `src/features/home/HomeScreen.tsx`, `src/features/trade/routes.ui.test.tsx`

**Interfaces:**
- Consumes: `computeRoutes`, `RouteInput`, `RouteOption`, `useUex`, `FreshnessBadge`, `formatAuec`, `formatScu`, `formatPercent`.
- Produces: `interface Prefs { shipId: number | null; budget: number; excludeIllegal: boolean; originSystem: string; sortBy: 'profit' | 'roi'; warnHours: number; staleDays: number }`, `DEFAULT_PREFS` (`shipId null, budget 0, excludeIllegal true, originSystem '', sortBy 'profit', warnHours 24, staleDays 7`), `loadPrefs(): Prefs`, `savePrefs(p: Prefs): void` (localStorage chave `tayko.prefs`, leitura/escrita em try/catch; JSON inválido → `DEFAULT_PREFS`), `usePrefs(): [Prefs, (patch: Partial<Prefs>) => void]`.

- [ ] **Step 1: Testes que falham**
  - `prefs.test.ts`: salva e lê; JSON corrompido → padrão; campos faltando completados com o padrão.
  - `routes.ui.test.tsx`: escolher Caterpillar (576 SCU) e orçamento 5.000.000 → card mostra `COMPRA`, `LEVA 434 SCU (limite: estoque)`, `VENDE`, `LUCRO ≈ 630.602 aUEC`, e a idade dos dois preços; demanda desconhecida mostra "demanda desconhecida"; orçamento vazio mostra "Informe quanto você tem para investir."; nave com 0 SCU mostra "Essa nave não tem carga em SCU."; lista de naves só tem `scu > 0`.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. Layout do card conforme o esboço do spec §6; o limitador vai em destaque (`--orange`). Campo de orçamento aceita "1.200.000" ou "1200000". HOME: logo grande, `// VISÃO GERAL`, top 5 rotas com a nave/orçamento salvos (sem nave salva: botão "Configurar calculadora" que abre TRADE › Routes), painel de cache (cada recurso com `formatAge` do `fetchedAt`) e botão "Atualizar tudo". **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat: calculadora de rotas e HOME`.

### Task 11: NAVES / SHIPS

**Files:**
- Create: `src/domain/ships.ts`, `src/domain/ships.test.ts`, `src/features/ships/ShipsView.tsx`, `src/features/ships/ShipsScreen.tsx`, `src/features/ships/ships.test.tsx`
- Modify: `src/data/types.ts`, `src/data/ttl.ts` (recursos `vehicles_purchases_prices_all` e `vehicles_rentals_prices_all`, TTL 12 h), `src/app/App.tsx` (habilita a aba)

**Interfaces:**
- Produces:
  - `types.ts`: `Vehicle` ganha `crew: string`, `pad_type: string | null`, `company_name: string`, `url_photo: string | null`, e as flags `is_military, is_bomber, is_exploration, is_passenger, is_racing, is_refinery, is_refuel, is_repair, is_medical, is_science, is_research, is_stealth, is_starter, is_construction, is_datarunner, is_interdiction, is_carrier, is_spaceship`; `VehiclePrice` (`id, id_vehicle, id_terminal, price_buy, date_modified, vehicle_name, terminal_name`); `VehicleRent` (mesmo com `price_rent`).
  - `ships.ts`: `type ShipRole = 'cargo' | 'mining' | 'salvage' | 'ground' | 'combat' | 'exploration' | 'passenger' | 'racing' | 'refinery' | 'refuel' | 'repair' | 'medical' | 'science' | 'stealth' | 'starter' | 'construction' | 'datarunner' | 'interdiction' | 'carrier'`; `shipRoles(v: Vehicle): ShipRole[]` (combat = is_military ou is_bomber; science = is_science ou is_research; ground = is_ground_vehicle; os demais 1:1 com a flag; ordem da lista acima); `interface ShipOffers { buy: VehiclePrice[]; rent: VehicleRent[]; minBuy: number | null; minRent: number | null }`; `shipOffers(vehicleId, purchases, rentals): ShipOffers` (ignora preço 0, ordena crescente); `searchShips(vehicles, query, role?: ShipRole): Vehicle[]` (busca em `name`, `name_full`, `company_name`, sem diferenciar maiúsculas/acentos).
  - Rótulos dos tipos via `t('role.<ShipRole>')` (traduzidos; são categorias, não produtos).

- [ ] **Step 1: Testes que falham**
  - `ships.test.ts`: Caterpillar com `is_cargo 1, is_military 0` → `['cargo']`; nave `is_military 1, is_bomber 1` → `['combat']` (sem repetição); `shipOffers` ordena compra crescente, ignora 0, `minBuy` null sem oferta; `searchShips('drake')` acha pelo fabricante; `searchShips('', 'mining')` só naves de mineração.
  - `ships.test.tsx`: tabela com Nave, Fabricante, Tipo (chips), SCU, Tripulação, Pad, Compra a partir de, Aluguel a partir de; nave sem oferta mostra "Não vendida in-game"; clicar abre detalhe com foto (`url_photo`), lista de terminais de compra/aluguel com preço e idade; em EN os cabeçalhos mudam e o nome da nave não.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat: aba NAVES`.

### Task 12: SETTINGS e instalador

**Files:**
- Create: `src/features/settings/SettingsScreen.tsx`, `src/features/settings/settings.test.tsx`
- Modify: telas que usam `FreshnessBadge`, para passar `warnHours`/`staleDays` das prefs

"Local atual" (spec §6) fica para a fase 2, onde o Refine Planner o usa.

**Interfaces:**
- Consumes: `usePrefs`, `clearCache`.

- [ ] **Step 1: Testes que falham**: seletor de idioma PT-BR/EN; alterar "Avisar dado envelhecendo após (h)" para 12 muda o badge de um preço de 13 h para laranja; "Limpar cache" chama `clearCache` e mostra "Cache limpo."; seção "Sobre" mostra versão do app, "Dados: UEX Corp (uexcorp.space)" e o aviso CIG.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** PASS.
- [ ] **Step 5:** `npm test` → todos passam. `npm run tauri build` → gera instalador NSIS em `src-tauri/target/release/bundle/nsis/`. Instalar, abrir, conferir: dados carregam, fechar e reabrir mostra cache na hora, desligar a internet e reabrir mostra os dados do cache com aviso.
- [ ] **Step 6:** Ler os termos de uso do UEX (uexcorp.space/about/terms) e relatar ao usuário qualquer exigência (crédito, uso de marca, limites) antes de distribuir o instalador para a org.
- [ ] **Step 7:** Commit `feat: settings e build do instalador`.
