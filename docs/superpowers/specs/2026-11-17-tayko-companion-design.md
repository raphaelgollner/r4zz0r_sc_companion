# TAYKO CORP COMPANION — Design

Data: 2026-11-17 · Status: revisado após respostas do usuário, aguardando aprovação

## 1. Intenção e o porquê

A Tayko Corp é uma org de Star Citizen focada em **mineração, salvage, compra/venda de carga e transporte de carga**. Hoje os membros consultam o site do UEX (uexcorp.space), que tem os dados mas espalhados em muitas páginas e sem as contas que a org faz no dia a dia ("quanto gasto para encher minha nave?", "onde vendo melhor?", "qual refinaria compensa?").

O Companion é um **app local de Windows** com a marca da Tayko, visual futurista estilo site da RSI, que:
- reúne os dados do UEX em abas por atividade, com navegação mais direta que o site;
- adiciona **calculadoras** que respondem as perguntas práticas da org;
- deixa sempre visível **estoque e data da última atualização** de cada dado, porque os dados do UEX vêm da comunidade e envelhecem.

Uso típico: membro com o jogo aberto, app na segunda tela (ou alt-tab), decidindo o que comprar/vender/minerar/refinar.

## 2. Objetivos, não-objetivos, anti-objetivos

**Objetivos**
- Abas TRADE, MINING, SALVAGE com subabas espelhando o que o UEX oferece, mais as calculadoras da Tayko.
- Calculadora de rota que considera nave (SCU), dinheiro disponível, estoque na origem e demanda no destino.
- Ajudar a escolher onde refinar (rendimento × método × distância) e onde comprar equipamento de mineração.
- Cobrir mineração em solo (veículo ROC ou manual) e salvage **na medida em que o UEX tiver dados** (ver §3.1).
- App leve, que não atrapalha o jogo rodando ao lado.

**Não-objetivos (por agora)**
- Servidor próprio, contas de usuário ou dados compartilhados entre membros. Companion individual: cada usuário tem seus dados locais.
- Login ou vínculo com a RSI ou com o UEX (nenhum token, nenhuma conta).
- Dados que o UEX não fornece (laser por rocha, spawn detalhado de minérios, locais de salvage, base de dados própria da org).
- Escrever dados no UEX (enviar preços, registrar trades).
- Overlay dentro do jogo.
- Executável assinado e auto-update — ficam para uma fase posterior (usuário pediu explicitamente para deixar para depois).

**Anti-objetivos (falharia mesmo "funcionando")**
- Mostrar preço velho como se fosse atual, ou sugerir rota sem avisar que o estoque/dado é antigo.
- App pesado que rouba memória/CPU do Star Citizen.
- Estourar o limite da API do UEX e ficar bloqueado.
- Visual genérico de "planilha" — a cara futurista e a marca Tayko são parte do produto.

## 3. Restrições e fatos verificados da fonte de dados (UEX API 2.0)

Verificado na documentação em 2026-11-17:
- Base: `https://api.uexcorp.uk/2.0/{recurso}/` (domínio **.uk**; a documentação fica em uexcorp.space). Resposta `{ "status": "ok", "data": ... }`.
- Endpoints GET públicos aparentam **não exigir token**. O app usa só esses e **não tem login nem token** (decisão do usuário). Se algum endpoint necessário exigir token, a funcionalidade fica de fora.
- **Limite: 120 requisições/minuto, 172.800/dia.**
- Frequência de atualização / cache sugerido pelo UEX: commodities 1 h; commodities_prices e commodities_routes 30 min (atualizam de hora em hora, routes no máximo 500 linhas); items_prices 1 dia; vehicles e terminals 12 h (mudam por patch).
- CORS: verificado em 2026-11-17, a API responde `Access-Control-Allow-Origin: *` → as chamadas podem sair direto da interface (TypeScript), sem código Rust.
- Rodapé do UEX: dados mantidos pela comunidade, podem não refletir servidores live. O app credita o UEX ("Dados: UEX Corp") em local visível. Os termos de uso (uexcorp.space/about/terms) **ainda precisam ser lidos** antes da distribuição.

Endpoints principais que o app usa:

| Endpoint | Uso no app |
|---|---|
| `commodities` | Lista e flags (is_raw, is_mineral, is_refinable, is_harvestable, is_extractable, is_illegal…); `ids_planets/moons/orbits/poi` possivelmente indicam onde são encontradas (a confirmar com dados reais) |
| `commodities_prices` / `commodities_prices_all` | Preço compra/venda por terminal, `scu_buy` (estoque à venda), `scu_sell_stock` (estoque no terminal) e `scu_sell` (demanda), `status_buy/sell`, `date_modified` |
| `commodities_raw_prices` | Preço de minério bruto por terminal |
| `commodities_routes` | Rotas prontas (margem, ROI, distância, score) — base da calculadora |
| `commodities_status` | Significado dos níveis de `status_*` (a buscar) |
| `refineries_yields`, `refineries_methods`, `refineries_capacities` | Bônus de rendimento por refinaria/commodity; métodos (ratings 1–3 de rendimento/custo/velocidade) |
| `vehicles` | Naves e veículos: `scu`, flags is_mining, is_salvage, is_cargo, is_ground_vehicle |
| `items`, `items_prices`, `items_attributes`, `categories` | Lasers/módulos de mineração e onde comprar (via categoria com `is_mining`) |
| `terminals`, `star_systems`, `planets`, `moons`, `orbits`, `space_stations`, `cities`, `outposts`, `poi` | Hierarquia de locais |
| `terminals_distances` / `orbits_distances` | Distâncias para "mais próximo" (a confirmar formato) |
| `currencies_index` (+ `_history`) | Currencies Index (índice de cesta de preços, não câmbio) |
| `fuel_prices` | Preço de combustível (opcional) |

**Lacunas confirmadas — o UEX não tem:**
- Que laser/módulo cada rocha exige (resistência/instabilidade).
- Composição/spawn por rocha ou depósito (só as listas de IDs em `commodities`, de significado não documentado).
- Locais de salvage (destroços, cemitérios).
- Endpoint de "Harvestables" (só a flag `is_harvestable`); Price Finder e Routes são telas do site, não endpoints.
- Não confirmado se gemas de mineração em solo (Hadanite, Aphorite, Dolivine, Janalite, Beradom, Feynmaline…) e RMC/Construction Materials aparecem em `commodities` — verificar na primeira chamada real.

### 3.0 Verificado com chamadas reais (2026-11-17)
- `commodities` (205 itens) inclui **RMC, Construction Materials (CMAT)** e as gemas **Hadanite, Aphorite, Dolivine, Janalite, Beradom, Feynmaline** (flag `is_harvestable`). Salvage e Ground Mining entram.
- `ids_planets` / `ids_moons` vêm preenchidos para minérios e gemas → "onde aparece" entra (cruzando com `planets`/`moons`).
- `commodities_prices_all`: uma chamada traz todos os ~2.600 preços (compra/venda, `scu_buy`, `scu_sell`, `scu_sell_avg`, `status_*`, `date_modified` em segundos Unix, nomes de commodity e terminal).
- `scu_sell` (demanda) vem 0 em muitas linhas: usar `scu_sell_avg` como reserva; se os dois forem 0, demanda **desconhecida** — não limita a quantidade e mostra o aviso "demanda desconhecida".
- `commodities_status` traz os níveis 1–7 com nome e cor (ex.: 1 "Out of Stock", 4 "Medium Inventory").
- `terminals` traz `star_system_name`, `planet_name`, `moon_name`, `space_station_name`, `city_name`, `outpost_name`, `displayname`.
- `vehicles.scu` é 0 para naves de mineração/ROC (a carga delas não é SCU de cargo).

### 3.1 Regra de dados (decisão do usuário)

**Só entra no app o que o UEX fornece.** Tela, coluna ou seção cujo dado não exista no UEX fica de fora nesta versão — nada de dados manuais, base da org ou números estimados. Na abertura de cada fase, quem constrói verifica com chamadas reais à API quais dados existem e corta o que faltar, registrando o corte no documento. Em particular:
- Laser necessário por rocha: fora.
- "Onde aparece" dos minérios: só se os campos `ids_*` de `commodities` realmente indicarem locais; senão, fora.
- Gemas de solo: só se estiverem em `commodities`/preços; senão, a subaba Ground Mining mostra apenas os veículos ROC de mineração (`vehicles`) ou é cortada se ficar vazia.
- Salvage: se RMC/Construction Materials não estiverem no UEX, a aba SALVAGE inteira fica de fora.

## 4. Abordagens consideradas

| | Tauri 2 + React | Electron + React | .NET WPF (C#) |
|---|---|---|---|
| Visual HUD futurista | Fácil (HTML/CSS) | Fácil (HTML/CSS) | Trabalhoso |
| Tamanho / RAM ao lado do jogo | ~10 MB / baixa | ~150 MB / 200–400 MB | Pequeno / baixa |
| Manutenção | Quase tudo TS; Rust para compilar | Só JS/TS | C# (familiar ao usuário) |
| Assinatura de exe depois | Sim | Sim | Sim |

**Escolhida: Tauri 2 + React + TypeScript** (recomendação aceita pelo usuário), pelo visual e por ser leve ao lado do jogo.

## 5. O que foi decidido com o usuário

- App local de Windows; executável assinado mais tarde.
- Tela inicial com título **"TAYKO CORP COMPANION"** e a logo da Tayko.
- Organização em **abas por categoria**, com subabas. Aba **TRADE** com subabas iguais às do UEX: Commodities, Locations, Harvestables, Price Finder, Currencies Index etc.
- Calculadora de compra/venda: escolhe nave da lista do UEX (SCU total), informa dinheiro disponível; o app mostra custo para encher, quanto comprar, melhor local de venda e lucro estimado.
- Sempre exibir estoque e última atualização.
- Considerar a demanda/limite de venda no destino (proposto e aceito).
- **Mineração**: onde refinar, refinaria mais próxima com melhor custo, equipamentos — dentro da regra §3.1.
- **Salvage** e **mineração em solo** (ROC ou manual): só com dados do UEX; o que não tiver dado fica de fora (§3.1).
- Companion individual, local, sem login na RSI ou no UEX. Cada usuário tem seus próprios dados salvos (naves, preferências).
- Identidade visual: logo da Tayko (engrenagem dourada + torres de aço escovado).

## 6. Estrutura do app

```
TAYKO CORP COMPANION
├─ HOME        visão geral: melhores rotas do momento, status do cache, atalhos
├─ TRADE
│   ├─ Commodities      lista + detalhe (preços por terminal, histórico)
│   ├─ Locations        navegar sistema → planeta → lua/estação → terminal
│   ├─ Harvestables     commodities com is_harvestable, onde vender
│   ├─ Price Finder     busca rápida "onde compro/vendo X mais barato/caro"
│   ├─ Routes (Tayko)   calculadora de rota com nave + dinheiro
│   └─ Currencies Index índice e histórico
├─ MINING
│   ├─ Ores             minérios, valor bruto vs refinado (onde aparecem: só se houver dado)
│   ├─ Refineries       bônus por refinaria/minério, métodos
│   ├─ Refine Planner   melhor refinaria para minha carga (ver §7.2)
│   ├─ Equipment        lasers/módulos/gadgets e onde comprar
│   └─ Ground Mining    ROC e manual (condicional, §3.1)
├─ SALVAGE            (condicional: só se RMC/CMAT existirem no UEX, §3.1)
│   ├─ Materials        RMC, Construction Materials: onde vender, preço
│   └─ Salvage Planner  nave de salvage + carga → melhor venda
├─ FLEET                "minhas naves": lista pessoal salva localmente, usada nas calculadoras
└─ SETTINGS            local atual, limites de "dado velho", cache
```

Nomes de abas em inglês como o usuário escreveu e como no UEX; textos explicativos em pt-BR. Só pt-BR nesta fase, sem sistema de tradução. *(minha decisão)*

**Quem usa**: vários membros da org, cada um com o app instalado no próprio PC, sem login e sem token (decisão do usuário).

### Esboço da calculadora de rota

```
Nave: [Caterpillar ▾] 576 SCU     Dinheiro: [1.200.000] aUEC   Origem: [qualquer ▾]
───────────────────────────────────────────────────────────────────────────────
#1  Laranite   ArcCorp 141 → Lorville CBD
    COMPRA 27,4/SCU · estoque 2.300 SCU · atualizado há 3 h
    LEVA   576 SCU  (limite: nave)  = 15.782 aUEC
    VENDE  31,9/SCU · demanda 900 SCU · atualizado há 1 h
    LUCRO  ≈ 2.592 aUEC · ROI 16% · 41 Gm
#2  ...
```

## 7. Regras de cálculo

### 7.1 Rota de compra/venda
Para cada par origem/destino de uma commodity (base `commodities_routes`, complementado por `commodities_prices`):
- `qtd = min(SCU_nave, floor(dinheiro / preço_compra), estoque_origem, demanda_destino)`
- Mostrar qual dos quatro foi o limitante.
- `custo = qtd × preço_compra`, `receita = qtd × preço_venda`, `lucro = receita − custo`.
- Ordenar por lucro total (padrão) ou ROI. Distância fica fora da fase 1 (`commodities_prices_all` não traz distância; `commodities_routes` exige filtro por commodity/origem).
- Fonte: `commodities_prices_all` cruzando, para cada commodity, terminais que vendem para o jogador (`price_buy > 0`) com terminais que compram (`price_sell > 0`), em terminais diferentes.
- Dado com mais de X horas (padrão 24 h, configurável) recebe aviso visual âmbar; mais de 7 dias, vermelho.
- Filtros: excluir ilegais (padrão ligado), sistema de origem. Pad/containers ficam para depois.

### 7.2 Refine Planner
Entrada: minério(s) e quantidade, local atual. Para cada refinaria: bônus de rendimento (`refineries_yields`) × preço de venda do refinado; método escolhido (ratings de `refineries_methods`); distância do local atual. Saída: ranking com valor estimado e distância. Custo exato e tempo por método **não existem na API** — o app mostra os ratings (baixo/médio/alto), não números inventados.

### 7.3 Salvage Planner (condicional)
Entrada: nave de salvage (`is_salvage`), SCU de RMC/CMAT. Saída: melhores terminais de venda com preço, demanda e data, como na rota.

### 7.4 Ground Mining (condicional)
Gemas/minérios de solo (se presentes em `commodities`): valor por SCU/unidade, onde vender, veículo ROC (`is_ground_vehicle` + `is_mining`) e capacidade.

## 8. Dados locais do usuário

Só preferências e a lista "minhas naves" (FLEET), guardadas no PC de cada usuário. Sem base de dados da org, sem sincronização, sem exportação nesta versão.

## 9. Arquitetura

- **Frontend**: React + TypeScript + Vite, CSS próprio (sem framework pesado de UI) para o visual HUD.
- **Dados (TypeScript)**: chamadas HTTP ao UEX direto da interface (CORS liberado); fila com limite (≤ 100 req/min); cache local em **IndexedDB** com TTL por endpoint (tabela §3); retorna dado + idade. O lado Rust do Tauri fica só com a janela. *(mudança em relação ao rascunho: SQLite/Rust virou IndexedDB/TS depois de confirmar o CORS — menos código Rust, mais fácil de testar)*
- Abertura: mostra o cache imediatamente e atualiza em segundo plano; indicador global "dados atualizados há N min".
- Botão "atualizar" por tela respeita o limite.
- Funciona offline com o último cache.

### Identidade visual
- Alinhado ao site da org (tayko.org), que o usuário indicou como referência: tokens `--gold #F4C430`, `--gold-light #FFD700`, `--gold-dark #C9A22B`, `--orange #FF8C00`, `--accent #FF6B00`, `--black #0A0A0F`, `--dark-gray #1A1A1A`, `--mid-gray #2A2A2A`, `--light-gray #3A3A3A`, `--white #E8E8E8`, brilho `rgba(244,196,48,.5)`.
- Fontes **Orbitron** (títulos, caixa alta) e **Exo 2** (texto), embutidas no app via pacotes @fontsource (sem internet). Números com `font-variant-numeric: tabular-nums`.
- Cantos chanfrados com `clip-path: polygon(0 0, 90% 0, 100% 10%, 100% 100%, 10% 100%, 0 90%)` (mesmo motivo do site); rótulos de seção no estilo `// NOME DA SEÇÃO`.
- Aço escovado/prata da logo nos detalhes; vermelho para dado muito velho, laranja para dado envelhecendo; verde para lucro.
- Logo: versão PNG com fundo transparente (usuário fornece ou recortamos a versão de fundo branco).

## 10. Fases de entrega

1. **Fundação + TRADE**: casca do app, visual, cache/fila, HOME, Commodities, Locations, Price Finder, Routes (calculadora), Harvestables, Currencies Index.
2. **MINING**: Ores, Refineries, Refine Planner, Equipment, Ground Mining.
3. **FLEET + SALVAGE** (SALVAGE só se houver dados, §3.1).
4. **Distribuição**: instalador, assinatura de código, auto-update.

## 11. Deixado para quem constrói

- Estrutura de pastas, bibliotecas de tabela/gráfico, esquema exato do SQLite.
- Animações e detalhes finos do visual, dentro da paleta acima.
- Como mapear categorias de itens de mineração (descobrir nomes reais via `categories`).
- Interpretação dos campos `ids_*` de commodities e dos níveis de `status_*` (verificar com dados reais).
