# 0.5.0 INÍCIO de sessão — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Reorganizar abas (INÍCIO = progresso), transações com recurso/local/SCU, resumo e limpeza da sessão, marcações nas rotas com OCULTAR, Dados salvos em AJUSTES, explicação do Currencies Index, link da org e versão 0.5.0.

**Architecture:** Mudanças locais por feature; domínio puro testado primeiro (`domain/progress.ts`, `domain/routeMarks.ts`), stores no padrão existente, UI com Testing Library.

**Tech Stack:** React 19, TS, Vitest, Tauri 2 (+ `tauri-plugin-opener`).

**Spec:** `docs/superpowers/specs/2026-11-18-inicio-sessao-design.md`

## Global Constraints
- Ordem das abas: `INÍCIO · TRADE · MINERAÇÃO · SALVAGE · NAVES · FROTA · AJUSTES` (EN: `HOME · TRADE · MINING · SALVAGE · SHIPS · FLEET · SETTINGS`).
- TRADE: `Routes` primeira e padrão.
- Marcações que expiram: `done, lowStock, noDemand, priceOff`; fixas: `danger, hidden`.
- Chave de rota `${commodityId}:${buyTerminal}:${sellTerminal}`; localStorage `tayko.routeMarks`.
- LIMPAR DADOS só zera o progresso.
- Toda string nova em PT e EN no `dict.ts`.

## Review Focus
- Progresso antigo salvo sem os campos novos abre e soma igual.
- Marcação expirada some quando só a venda (ou só a compra) recebeu dado novo.
- Rota oculta não reduz a lista abaixo do limite (filtrada antes do corte).
- Oculta que deixou de calcular continua listável e "Mostrar de novo" funciona.
- SCU × preço preenche o valor, mas valor editado à mão depois não é sobrescrito sem mudar SCU/preço.

---

### Task 1: abas, TRADE e AJUSTES
**Files:** `src/app/App.tsx`, `src/app/screens.tsx`, `src/app/App.test.tsx`, `src/features/settings/*`, remove `src/features/home/*`, `src/features/trade/RouteControls.tsx` (sem `compact`), testes que usam `HomeView` (`routeControls.test.tsx`, `avoid.test.tsx`), `dict.ts`.
- [ ] RED: App.test com ordem nova, `#progress`→INÍCIO, TRADE abre em Routes e lista Routes primeiro; settings.test "Dados salvos" mostra recursos e "Atualizar tudo" chama a função.
- [ ] GREEN: `MainTab` sem `progress`; `home` renderiza `ProgressView`; `SettingsView` recebe `cache`, `refreshing`, `onRefreshAll` e tem grid de 2 colunas; `SettingsScreen` carrega os recursos (código que era do `HomeScreen`).
- [ ] Suite + lint; commit.

### Task 2: domínio do progresso
**Files:** `src/domain/progress.ts`, `src/domain/progress.test.ts` (criar ou estender)
**Produces:** campos opcionais em `Tx`; `commoditySummary(txs: Tx[]): {commodityId, name, boughtScu, soldScu, net}[]`; `placesVisited(txs: Tx[]): {terminalId, name, actions: {kind:'buy'|'sell', commodity: string}[]}[]`; `clearProgress(): ProgressData`.
- [ ] RED: soma por recurso (compra negativa conta SCU comprado, venda positiva SCU vendido, ordenado por net desc); lugares na ordem do primeiro lançamento, sem repetir ação; tx sem recurso não entra no resumo por recurso.
- [ ] GREEN; commit.

### Task 3: tela INÍCIO
**Files:** `ProgressView.tsx` (+ wrapper que lê commodities/terminals do UEX sem bloquear), testes de progresso, `dict.ts`, `theme.css`.
- [ ] RED: sem "Perfil"/"Trocar foto"; escolher recurso e local, SCU 100 e preço 2.500 → valor "250.000"; salvar mostra Recurso/Local na tabela; resumo da sessão mostra o recurso e "Comprou Quartz"; LIMPAR DADOS abre janela com o aviso e Limpar zera saldo; Cancelar mantém.
- [ ] GREEN; remover testes de perfil; commit.

### Task 4: domínio e store das marcações
**Files:** `src/domain/routeMarks.ts` (+test), `src/store/routeMarks.ts` (+test), `src/domain/routes.ts` (+test)
**Produces:** `MarkKind`, `EXPIRING`, `routeKey(r: RouteOption)`, `activeMarks(rec, buyAt, sellAt): MarkKind[]`, `toggleMark(rec|undefined, kind, route): rec|undefined`, `useRouteMarks()`; `RouteInput.hiddenKeys?: Set<string>` e `RouteInput.onlyKeys?: Set<string>`.
- [ ] RED: expiração por compra e por venda; fixas não expiram; toggle remove registro vazio; remarcar atualiza datas; `computeRoutes` pula ocultas antes do limite e `onlyKeys` devolve só elas; store lê dado malformado como vazio.
- [ ] GREEN; commit.

### Task 5: marcações na tela de Routes
**Files:** `RouteCard.tsx`, `RoutesView.tsx`, `useRouteResult.ts`, testes, `dict.ts`, `theme.css`.
- [ ] RED: marcar ESTOQUE MENOR mostra etiqueta; marcar OCULTAR tira o card; "Ver ocultas (1)" mostra o card; oculta sem rota calculável aparece na lista simples e "Mostrar de novo" a devolve; etiqueta de marcação expirada não aparece com preço mais novo.
- [ ] GREEN; commit.

### Task 6: Currencies, link da org, versão
**Files:** `CurrenciesView.tsx`, `App.tsx` (Header), `src/ui/openUrl.ts`, `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`, `src-tauri/capabilities/default.json`, `package.json`, `tauri.conf.json`, `dict.ts`.
- [ ] RED: Currencies mostra os parágrafos explicativos; header tem link "TAYKO.ORG" que chama `openUrl('https://tayko.org')`.
- [ ] GREEN; versão 0.5.0 nos três arquivos; `cargo check`; commit.

### Task 7 (adendo): nível de perigo
**Files:** `src/domain/risk.ts` (+test), `src/data/types.ts` (`faction_name?`), `src/ui/TerminalName.tsx` (+test), `RouteCard.tsx`, `src/domain/routes.ts` (`RouteInput.maxRisk`), `src/store/prefs.ts` (`maxRisk`), `RouteControls.tsx`, `dict.ts`, `theme.css`.
- [ ] RED: `riskOf` para cada regra do adendo; `computeRoutes` com `maxRisk: 'medium'` descarta rota com venda ARRISCADA; TerminalName mostra "SEGURO" com title de aviso; select "Risco máximo" filtra e mostra o aviso.
- [ ] GREEN; commit.
