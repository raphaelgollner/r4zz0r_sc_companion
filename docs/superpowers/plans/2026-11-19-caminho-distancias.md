# CAMINHO e REDUZIR DISTÂNCIAS — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans.

**Goal:** Caminhos encadeados de comércio e ordenação por lucro por Gm em TRADE › Routes.
**Spec:** `docs/superpowers/specs/2026-11-19-caminho-distancias-design.md`

## Review Focus
- Caminho sem saída lucrativa no meio → termina curto e avisa, sem travar.
- Dinheiro acumulado muda a quantidade dos trechos seguintes.
- Distância 0 ou nula não divide por zero nem some a rota.
- Distâncias pendentes não bloqueiam a tela (lista por lucro até chegar).
- Prefs antigos sem os campos novos → padrões.

### Task 1: domínio
`src/domain/routes.ts` ganha `RouteInput.fromTerminal?`. Novo `src/domain/path.ts`:
- `bestPaths(prices, commodities, terminals, input, { legs, start, count=3 }): TradePath[]` (feixe);
- `greedyPaths(..., distanceOf): { paths: TradePath[]; pending: [number, number][] }`;
- `rankByDistance(routes, distanceOf)`.

`TradePath = { legs: RouteOption[]; total: number; short: boolean }`. Testes primeiro.

### Task 2: prefs e controles
`Prefs.pathMode/shortDistances/pathStart/pathLegs` (saneados). Em `RouteControls`, as caixas CAMINHO e REDUZIR DISTÂNCIAS, e com CAMINHO os campos "Começar em" e "Trechos".

### Task 3: tela
`RoutesView` mostra os caminhos (`PathList`) ou a lista ordenada por distância. Busca distâncias com `DistanceFetcher`. `RouteCard` ganha `legLabel` e `distance`. Teste de UI com fetch simulado.
