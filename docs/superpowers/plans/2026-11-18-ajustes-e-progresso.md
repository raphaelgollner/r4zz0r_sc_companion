# Ajustes da fase 1 + PROGRESSO — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Localização/tooltips em todo o app, controles de nave/SCU/dinheiro no INÍCIO, janela da loja em NAVES e a nova aba PROGRESSO com sessões.

**Architecture:** Mesma base (React + TS, funções puras em `src/domain`, views por props + screens com hooks). Terminais ficam num contexto único para qualquer tela mostrar nome + lugar + tooltip. PROGRESSO usa IndexedDB num store próprio, separado do cache do UEX.

**Tech Stack:** React 19, TypeScript, Vitest + Testing Library, idb-keyval.

**Spec:** `docs/superpowers/specs/2026-11-18-ajustes-e-progresso-design.md` (e o design original `2026-11-17-tayko-companion-design.md`)

## Global Constraints
- Todo texto novo via `t()` com chaves em `pt` e `en` (`src/i18n/dict.ts`). Nomes de produtos/terminais/locais nunca traduzidos.
- Caminho de localização: `Sistema › Planeta › Lua › Estação/Cidade/Posto`, separador ` › `, só níveis não vazios, sem repetir nomes iguais em sequência.
- Aba nova: pt `PROGRESSO`, en `PROGRESS`, posição logo depois de NAVES.
- Categorias de transação (chaves): `trade`, `mining`, `salvage`, `fuel`, `repair`, `purchase`, `other` — rótulos pt: Trade, Mineração, Salvage, Combustível, Reparo, Compra de nave/item, Outro; en: Trade, Mining, Salvage, Fuel, Repair, Ship/item purchase, Other.
- Foto do perfil reduzida para no máximo 256×256 px (JPEG, qualidade 0,85) e salva como data URL.
- "Limpar cache" não apaga dados do PROGRESSO.
- Números em formato pt-BR nos dois idiomas; valores digitados lidos com `parseAmount`.

## Review Focus
1. **Foto que não é imagem ou arquivo muito grande (> 10 MB)** → mensagem "Escolha um arquivo de imagem de até 10 MB.", nada salvo, sem quebrar. (Task 6)
2. **Excluir/editar transação de uma sessão já encerrada** → totais da sessão e saldo recalculados na hora. (Task 5)
3. **Valor vazio, 0 ou inválido numa transação** → botão Salvar desabilitado. (Task 6)
4. **App fechado com sessão ativa** → ao reabrir a sessão continua ativa e a duração conta desde `startedAt`. (Task 5)
5. **Terminal que não está na lista `terminals` (novo no UEX)** → mostra o `terminal_name` da linha, sem tooltip, sem erro. (Task 1)

---

### Task 1: Localização, Tooltip e TerminalName

**Files:**
- Create: `src/domain/location.ts`, `src/domain/location.test.ts`, `src/ui/Tooltip.tsx`, `src/data/terminals.tsx`, `src/ui/TerminalName.tsx`, `src/ui/terminalName.test.tsx`
- Modify: `src/ui/theme.css`, `src/main.tsx` (envolver App com `TerminalsProvider`)

**Interfaces:**
- Produces:
  - `locationPath(t: Terminal): string[]` — `[star_system_name, planet_name, moon_name, space_station_name ?? city_name ?? outpost_name]`, filtra vazios e repetição consecutiva.
  - `placeName(t: Terminal): string | null` — primeiro entre `space_station_name, city_name, outpost_name, moon_name, planet_name`.
  - `Tooltip({ content: ReactNode; children: ReactNode })` — envolve o filho num `span` com `tabIndex=0` quando o filho não é focável; mostra `role="tooltip"` no hover e no foco; esconde no `mouseleave`/`blur`/`Esc`.
  - `TerminalsProvider({ children })` (carrega `useUex<Terminal[]>('terminals')`) e `useTerminal(id: number): Terminal | null`; `TerminalsContext` exportado para testes com `value: Map<number, Terminal>`.
  - `TerminalName({ id: number; fallback: string })` — mostra `fallback` em destaque + `placeName` em `.muted` quando diferente do fallback e não contido nele; tooltip com `locationPath(t).join(' › ')`. Sem terminal no mapa: só `fallback`.

- [ ] **Step 1: Testes que falham**
  - `location.test.ts`: terminal em estação de Lagrange sem lua (`star_system 'Stanton', planet 'ArcCorp', moon null, space_station 'ARC-L1 Wide Forest Station'`) → `['Stanton','ArcCorp','ARC-L1 Wide Forest Station']`; terminal em posto na lua → `['Stanton','Hurston','Aberdeen','HDMS-Anderson']`; cidade → `['Stanton','Hurston','Lorville']`; só sistema → `['Pyro']`; `placeName` da estação → `'ARC-L1 Wide Forest Station'`, do posto → `'HDMS-Anderson'`.
  - `terminalName.test.tsx` (com `TerminalsContext.Provider value={new Map([[1, terminalEstação]])}`): `<TerminalName id={1} fallback="ARC-L1" />` mostra "ARC-L1" e "ARC-L1 Wide Forest Station"; `hover` → `getByRole('tooltip')` com "Stanton › ArcCorp › ARC-L1 Wide Forest Station"; `Tab` até ele também mostra o tooltip; id 999 → só "ARC-L1" e nenhum tooltip (Review Focus 5).
- [ ] **Step 2:** `npx vitest run src/domain/location.test.ts src/ui/terminalName.test.tsx` → FAIL.
- [ ] **Step 3:** Implementar. Tooltip posicionado acima do elemento (`position: absolute` dentro de um `span` `position: relative`), fundo `--panel`, borda `--gold-dark`, `z-index` alto, `white-space: nowrap`.
- [ ] **Step 4:** PASS. **Step 5:** Commit `feat: localização dos terminais com tooltip`.

### Task 2: Tooltips e nomes de lugar em todas as telas

**Files:**
- Modify: `src/features/trade/shared.tsx` (PriceTable), `PriceFinderView.tsx`, `HarvestablesView.tsx`, `LocationsView.tsx` (folhas com tooltip do caminho), `RouteCard.tsx`, `src/features/ships/ShipsView.tsx` (terminais do detalhe), `src/ui/components.tsx` (StatusBadge, FreshnessBadge), `src/i18n/dict.ts`
- Test: `src/features/trade/tooltips.test.tsx`

**Interfaces:**
- Consumes: `TerminalName`, `Tooltip` (Task 1).
- Produces: `StatusBadge` tooltip = `"{name} ({percentage})"` vindo de `StatusLevel` (adicionar `percentage?: string` ao tipo); `FreshnessBadge` tooltip = data/hora `toLocaleString('pt-BR' | 'en-US')`; texto "limite: X" do RouteCard com tooltip `t('routes.limitWhy.<limitedBy>')` (pt: nave "A nave enche antes de acabar o dinheiro ou o estoque.", dinheiro "O dinheiro acaba antes de encher a nave.", estoque "O terminal não tem mais estoque que isso.", demanda "O destino não compra mais que isso."; en equivalente); chips de tipo de nave com tooltip do rótulo completo; células de nome longas com `title` não, tooltip sim.

- [ ] **Step 1: Testes que falham** (`tooltips.test.tsx`): Commodities detalhe mostra "Wide Forest Station" ao lado do terminal e o caminho no hover; StatusBadge hover → "Medium Inventory (44-57%)"; RouteCard hover em "limite: estoque" → "O terminal não tem mais estoque que isso."; Price Finder linha mostra o nome do lugar.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** `npm test` → todos PASS (atualizar asserts antigos que usavam só o texto do terminal, se quebrarem). **Step 5:** Commit `feat: tooltips e nome do lugar em todas as telas`.

### Task 3: Controles de nave, SCU e dinheiro no INÍCIO e Routes

**Files:**
- Create: `src/features/trade/RouteControls.tsx`, `src/features/trade/routeControls.test.tsx`
- Modify: `src/store/prefs.ts` (+ `scuOverrides: Record<number, number>` no `DEFAULT_PREFS` = `{}`), `src/store/prefs.test.ts`, `src/features/trade/RoutesView.tsx`, `src/features/home/HomeView.tsx`, `HomeScreen.tsx`, `src/features/trade/screens.tsx`, `src/i18n/dict.ts`

**Interfaces:**
- Produces:
  - `effectiveScu(prefs: Prefs, ship: Vehicle | null): number` em `src/store/prefs.ts` — override da nave se existir, senão `ship.scu`, `0` sem nave.
  - `RouteControls({ vehicles, terminals, prefs, onPrefs, balance?: number | null, compact?: boolean })` — campos: Nave (todas as naves, ordenadas por `name_full`, rótulo `"{name_full} · {scu} SCU"` ou só o nome se `scu` 0), **SCU** (número, valor = `effectiveScu`; ao editar grava `scuOverrides[shipId]`; botão "↺ usar SCU do UEX" remove o override, visível só com override), Dinheiro (com `parseAmount`), botão "Usar meu saldo" (visível quando `balance` não é null; seta `budget = balance`), e, se não `compact`, Sistema de origem, Ordenar por, Ignorar ilegais.
  - `RoutesView` e `HomeView` usam `RouteControls` e `effectiveScu` em vez de `ship.scu`. `HomeView` usa `compact`.
- [ ] **Step 1: Testes que falham** (`routeControls.test.tsx` + `prefs.test.ts`): naves sem SCU aparecem na lista ("Prospector"); escolher RSI Galaxy (64) e digitar 192 no SCU grava `scuOverrides[id] = 192` e o card mostra "LEVA 192 SCU" quando limitado pela nave; "↺ usar SCU do UEX" volta para 64; "Usar meu saldo" com `balance 750000` põe 750.000 no dinheiro; INÍCIO renderiza os controles e trocar a nave muda as rotas; `effectiveScu` sem override → `ship.scu`.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** `npm test` PASS. **Step 5:** Commit `feat: nave, SCU editável e dinheiro no INÍCIO e Routes`.

### Task 4: Janela da loja em NAVES

**Files:**
- Create: `src/ui/Dialog.tsx`, `src/features/ships/StoreDialog.tsx`, `src/features/ships/storeDialog.test.tsx`
- Modify: `src/features/ships/ShipsView.tsx`, `src/i18n/dict.ts`, `src/ui/theme.css`

**Interfaces:**
- Produces: `Dialog({ title: string; onClose(): void; children })` — `role="dialog"`, `aria-modal`, fecha com `Esc`, clique no fundo e botão "Fechar"; foco vai para o diálogo ao abrir. `StoreDialog({ terminalId, terminalName, vehicles, purchases, rentals, now, onPickShip(id), onClose })` — título = nome do terminal; linha com `locationPath` ou "Localização desconhecida"; tabelas "Naves à venda" e "Naves para alugar" (Nave, Tipo, Preço, Atualizado), ordenadas por nome; clicar numa nave chama `onPickShip` e fecha.
- [ ] **Step 1: Testes que falham**: no detalhe de uma nave, o terminal "New Deal Lorville" é um botão; clicar abre o diálogo com "Stanton › Hurston › Lorville" e lista as naves vendidas ali com preço; `Esc` fecha; clicar numa nave do diálogo seleciona essa nave no painel de detalhe.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** PASS. **Step 5:** Commit `feat: janela da loja de naves`.

### Task 5: PROGRESSO — regras e armazenamento

**Files:**
- Create: `src/domain/progress.ts`, `src/domain/progress.test.ts`, `src/store/progress.ts`, `src/store/progress.test.ts`

**Interfaces:**
- Produces (`src/domain/progress.ts`):
  - `type TxCategory = 'trade' | 'mining' | 'salvage' | 'fuel' | 'repair' | 'purchase' | 'other'`
  - `interface Tx { id: string; amount: number; kind: 'normal' | 'adjust'; category: TxCategory; description: string; at: number; sessionId: string | null }`
  - `interface Session { id: string; startedAt: number; endedAt: number | null }`
  - `interface Profile { name: string; photo: string | null }`
  - `interface ProgressData { profile: Profile; txs: Tx[]; sessions: Session[] }`, `EMPTY_PROGRESS`
  - `balance(txs: Tx[]): number`
  - `activeSession(data: ProgressData): Session | null`
  - `sessionSummary(s: Session, txs: Tx[], now: number): { income: number; expense: number; net: number; durationMs: number; count: number }` — ignora `kind 'adjust'`; `durationMs = (endedAt ?? now) - startedAt`.
  - Ações puras que devolvem novo `ProgressData`: `addTx(d, tx: Omit<Tx,'id'|'sessionId'|'kind'>, id: string)` (liga à sessão ativa), `updateTx(d, id, patch)`, `removeTx(d, id)`, `setBalance(d, target: number, at: number, id: string)` (cria `adjust` com `target - balance`, nada se diferença 0), `startSession(d, at, id)` (nada se já houver ativa), `endSession(d, at)`, `setProfile(d, patch)`.
- Produces (`src/store/progress.ts`): `progressStore()` (idb-keyval, banco `tayko-companion`, store `progress`, chave `data`) e `useProgress(): { data: ProgressData; ready: boolean; apply(fn: (d: ProgressData) => ProgressData): void }` — carrega uma vez, grava a cada `apply`; `ProgressProvider({ store?, children })` para testes com `memoryStore`.
- [ ] **Step 1: Testes que falham** (`progress.test.ts`): saldo de `[+1000 adjust, +500, -200]` = 1300; `setBalance` para 2000 a partir de 1300 cria ajuste de +700 e não cria nada se já for 2000; transação criada com sessão ativa recebe o `sessionId`; `sessionSummary` com entradas 500, saídas 200 e um ajuste → `{income 500, expense 200, net 300}` e duração por `endedAt`; sessão ativa usa `now` (Review Focus 4); `removeTx`/`updateTx` numa sessão encerrada mudam o `sessionSummary` (Review Focus 2); `startSession` com sessão ativa não cria outra. `store/progress.test.ts`: `apply` grava e um novo `ProgressProvider` com o mesmo store lê de volta (sessão ativa preservada).
- [ ] **Step 2:** FAIL. **Step 3:** Implementar (ids com `crypto.randomUUID()` nas telas; nas funções puras o id vem por parâmetro). **Step 4:** PASS. **Step 5:** Commit `feat: regras e armazenamento do PROGRESSO`.

### Task 6: Aba PROGRESSO

**Files:**
- Create: `src/features/progress/ProgressView.tsx`, `src/features/progress/photo.ts`, `src/features/progress/progress.ui.test.tsx`
- Modify: `src/app/App.tsx` (aba `progress` depois de `ships`, hash `#progress`), `src/app/screens.tsx`, `src/main.tsx` (`ProgressProvider`), `src/i18n/dict.ts`, `src/ui/theme.css`, `src/features/trade/screens.tsx` e `HomeScreen.tsx` (passar `balance` para `RouteControls`)

**Interfaces:**
- Consumes: Task 5, `parseAmount`, `formatAuec`, `Dialog`.
- Produces: `resizePhoto(file: File): Promise<string>` em `photo.ts` (rejeita com `Error('invalid_image')` se `!file.type.startsWith('image/')` ou `file.size > 10 * 1024 * 1024`; desenha num canvas até 256 px; `toDataURL('image/jpeg', 0.85)`).
- Tela (seções, nesta ordem): Perfil (foto redonda com borda dourada ou iniciais, nome editável, "Trocar foto"/"Remover foto"); Saldo (valor grande, "Definir saldo"); Sessão (sem sessão: botão "Iniciar sessão"; com sessão: "Sessão ativa", duração `h:mm` atualizada a cada 30 s, entradas/saídas/líquido, "Encerrar sessão"); Nova transação (Entrada/Saída, valor, categoria, descrição, data/hora `datetime-local` padrão agora, "Salvar" desabilitado se valor ≤ 0 ou inválido); Transações (filtro Todas / Desta sessão / Fora de sessão; colunas Data, Descrição, Categoria, Valor colorido; editar abre o formulário preenchido; excluir pede confirmação "Excluir esta transação?"); Sessões (Data, Duração, Entradas, Saídas, Líquido; clicar filtra as transações daquela sessão).
- [ ] **Step 1: Testes que falham**: "Definir saldo" 1.000.000 → saldo "1.000.000"; iniciar sessão, lançar entrada 250.000 "Venda Laranite" categoria Trade e saída 20.000 "Combustível" → sessão mostra líquido "230.000" e saldo "1.230.000"; Salvar desabilitado com valor vazio, "0" e "abc" (Review Focus 3); excluir a saída (confirmando) → líquido "250.000"; encerrar sessão → aparece no histórico de sessões; arquivo `text/plain` na foto → mensagem "Escolha um arquivo de imagem de até 10 MB." (Review Focus 1); em EN a aba é "PROGRESS"; "Usar meu saldo" em Routes usa o saldo.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** `npm test` PASS; `npm run build` sem erros. **Step 5:** Commit `feat: aba PROGRESSO com sessões`.

### Task 7: Conferência visual e instalador
- [ ] **Step 1:** Subir `npx vite --port 5173`, capturar INÍCIO, Commodities, Routes, NAVES (com diálogo) e PROGRESSO com dados reais (script CDP do scratchpad) e conferir tooltips/textos.
- [ ] **Step 2:** `npm run tauri build` → instalador em `src-tauri/target/release/bundle/nsis/`. Subir versão para `0.2.0` em `package.json`, `src-tauri/tauri.conf.json` e `src-tauri/Cargo.toml` antes do build.
- [ ] **Step 3:** Commit `chore: versão 0.2.0`.
