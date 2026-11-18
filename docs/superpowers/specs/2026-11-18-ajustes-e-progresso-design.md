# Tayko Corp Companion — Ajustes da fase 1 + aba PROGRESSO

Data: 2026-11-18 · Status: aguardando aprovação · Base: `2026-11-17-tayko-companion-design.md`

## Por quê
Feedback do usuário após usar a fase 1: em várias telas não dá para saber **onde fica** um terminal ou loja, a tela inicial "prende" na nave salva, o SCU de nave com módulo (ex.: Galaxy com módulo de carga) não bate com o UEX, e falta um jeito de acompanhar o dinheiro ganho por sessão de jogo.

## Decidido com o usuário
1. INÍCIO: trocar nave e dinheiro ali mesmo; **SCU digitável** (também em Routes).
2. Mostrar o nome da estação/base junto do terminal (ex.: "ARC-L3 · Wide Forest Station").
3. Tooltip de localização em **todas** as telas: Sistema › Planeta › Lua › Estação/Cidade/Posto, só com os níveis que existem.
4. NAVES: clicar numa loja abre uma janela com onde ela fica e as naves vendidas/alugadas ali.
5. Tooltips em tudo que tem informação essencial sem espaço.
6. Nova aba **PROGRESSO**: nome e foto opcionais (sem RSI), saldo informado à mão, histórico manual de entradas/saídas, e **sessões explícitas** (Iniciar/Encerrar sessão, ganho e duração por sessão, histórico de sessões). Transações fora de sessão contam no saldo.

## Abordagem
Mesma base da fase 1 (Tauri + React + TS, testes Vitest). Uma só forma sensata: estender os componentes existentes. Dados do PROGRESSO ficam **só no PC do usuário**.

## Design

### Localização e nome de terminal (itens 2, 3, 5)
- Função pura `locationPath(t: Terminal): string[]` → `[sistema, planeta, lua, estação/cidade/posto]` sem vazios nem repetições.
- `placeName(t)` = estação › cidade › posto › lua › planeta (primeiro que existir).
- Componente `<TerminalName id={id_terminal} fallback={terminal_name}>`: mostra **nome do terminal** + **nome do lugar** em cinza (quando diferente), com tooltip do caminho completo. Lê os terminais de um contexto carregado uma vez (recurso `terminals` do cache). Usado em Commodities, Locations, Price Finder, Routes/INÍCIO (cards), Harvestables, NAVES.
- Componente `<Tooltip content>` próprio (hover e foco do teclado, estilo do tema, `role="tooltip"`). Também aplicado em: status de estoque (nome completo + faixa %), "limite: …" na rota (explicação), idade do dado (data e hora exatas), chips de tipo de nave, nomes cortados.

### INÍCIO e Routes (item 1)
- Painel de configuração compacto no topo do INÍCIO com nave, SCU e dinheiro (mesmas preferências da calculadora — mudar num lugar muda no outro).
- Campo **SCU** preenchido com o SCU do UEX; se o usuário editar, o valor fica salvo **por nave** (`prefs.scuOverrides[shipId]`) e aparece um "↺ usar SCU do UEX". A lista de naves passa a incluir naves sem SCU no UEX (o usuário pode digitar).
- Botão **"Usar meu saldo"** ao lado do dinheiro (pega o saldo da aba PROGRESSO).

### Janela da loja (item 4)
- Na aba NAVES, o nome da loja vira link. Abre um diálogo modal (fecha com Esc/clique fora/botão) com: nome, caminho da localização, e tabela de naves **compradas** e **alugadas** ali (nave, tipo, preço, atualizado). Clicar numa nave do diálogo seleciona ela na tela.

### Aba PROGRESSO (item 6)
Posição: depois de NAVES (pt `PROGRESSO`, en `PROGRESS`).

- **Perfil:** nome e foto opcionais. A foto é escolhida do PC, reduzida para 256 px e salva localmente.
- **Saldo atual** em destaque. "Definir saldo" cria uma transação do tipo *ajuste* com a diferença; ajustes **não** contam como ganho de sessão.
- **Nova transação:** entrada (+) ou saída (−), valor, descrição, categoria (Trade, Mineração, Salvage, Combustível, Reparo, Compra de nave/item, Outro), data/hora (agora, editável). Editar e excluir (excluir pede confirmação).
- **Sessão:** botão "Iniciar sessão" → mostra sessão ativa com duração ao vivo, ganho líquido da sessão (entradas − saídas) e transações dela; "Encerrar sessão" fecha. Uma sessão ativa por vez. Transações criadas durante a sessão ficam ligadas a ela.
- **Histórico de sessões:** data, duração, entradas, saídas, líquido. Clicar abre as transações da sessão.
- **Histórico de transações:** lista com filtro (todas / desta sessão / fora de sessão).
- Armazenamento: IndexedDB local (store separado do cache do UEX — "Limpar cache" **não** apaga o progresso).
- Modelo:
  - `Profile { name: string; photo: string | null }` (photo = data URL 256 px)
  - `Tx { id; amount: number /* + entrada, − saída */; kind: 'normal' | 'adjust'; category; description; at: number; sessionId: string | null }`
  - `Session { id; startedAt: number; endedAt: number | null }`
  - Saldo = soma de todas as `Tx` (o primeiro "Definir saldo" vira um ajuste a partir de 0).

## Não-objetivos
- Ligação com RSI, sincronizar progresso entre membros, exportar/importar (fica para depois se pedirem).
- Calcular gastos automaticamente (combustível etc.) — tudo manual.

## Anti-objetivos
- Perder o progresso do jogador ao limpar cache ou atualizar o app.
- Tooltip que esconde o conteúdo ou não funciona por teclado.

## Deixado para quem constrói
Layout fino das telas, ícones, animação do tooltip, formato exato da data.
