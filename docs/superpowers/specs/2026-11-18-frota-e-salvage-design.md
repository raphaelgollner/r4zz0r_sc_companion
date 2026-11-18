# Fase 3 — FROTA, setup de naves, SALVAGE e ajustes de abas

Data: 2026-11-18 · Versão alvo: 0.4.0 · Base: `main` (0.3.0)

## 1. Por quê

A Tayko Corp trabalha com mineração, salvage, carga e transporte. Faltam três coisas no companion:

- **Ver o próprio hangar.** Cada jogador quer listar à mão as naves e veículos que tem e ver de cada uma o preço em dólar e em aUEC, o SCU, a categoria, a descrição e onde comprar.
- **Montar o setup de uma nave pela função dela:** quais lasers e módulos cabem numa Mole, qual combinação serve para Quantainium. Hoje isso exige ir a outros sites.
- **Vender o que o salvage rende:** RMC, Construction Materials etc.

Também entram ajustes pedidos pelo usuário: renomear INÍCIO para ROTAS, reordenar as abas e um botão "Copiar destino" no nome da estação, para colar na busca do mapa do jogo.

## 2. Objetivos, não-objetivos e anti-objetivos

**Objetivos**
- Aba FROTA: lista pessoal de naves e veículos, adicionados à mão e guardados no PC.
- Janela de setup por nave da frota:
  - encaixes reais da nave nas funções industriais dela;
  - itens que cabem em cada encaixe;
  - builds recomendadas a partir de atributos reais.
- Aba SALVAGE com dados do UEX.
- Abas renomeadas e reordenadas; botão "Copiar destino".

**Não-objetivos**
- Setup de combate: armas, mísseis, escudos, power plant, coolers e quantum drive.
- Simulação de energia e calor.
- Sincronização com a org ou com a conta RSI.
- Macro que controla o jogo. O usuário escolheu só "Copiar destino".
- Exportar ou importar a frota.

**Anti-objetivos.** Mesmo funcionando, isto é falha:
- Recomendar uma build de uma função que a nave não tem, como combate para a Mole.
- Recomendar um item que não cabe no encaixe (tipo ou tamanho errado).
- Inventar builds "de cabeça". Toda recomendação sai de uma regra sobre atributos vindos dos dados e mostra o critério usado.
- Quebrar a FROTA quando a Wiki estiver fora do ar. A lista e os dados do UEX continuam funcionando.

## 3. Restrições

- **Seguem valendo as regras das fases anteriores:**
  - app local Tauri;
  - sem login;
  - interface em PT-BR e EN;
  - nomes de produtos (naves, itens, commodities, terminais, locais) sempre em inglês;
  - visual tayko.org;
  - tooltips onde o texto é cortado.
- **Fontes de dados:**
  - UEX, como hoje;
  - **Star Citizen Wiki API** (`https://api.star-citizen.wiki/api/v2`), aprovada pelo usuário em 2026-11-18 como segunda fonte. Pública, sem token, CORS `*`, sem limite de consultas declarado.
- **Ligação entre as fontes:** pelo `uuid` do jogo. `vehicles.uuid` do UEX é aceito em `/api/v2/vehicles/{uuid}` da Wiki (testado com a Vulture). Os itens também têm `uuid` nas duas fontes. Nunca casar por nome.
- **CSP do Tauri:** acrescentar `https://api.star-citizen.wiki` em `connect-src`. Se as imagens da Wiki forem usadas, acrescentar o host delas em `img-src`. Minha decisão: usar só as fotos do UEX, que já funcionam, então `img-src` não muda.
- Descrições da Wiki vêm só em inglês (`en_EN`), que é o texto do jogo. Mostrar como vêm nos dois idiomas.

## 4. Abordagens consideradas

| | Como | Troca |
|---|---|---|
| **A — busca ao vivo + cache** *(escolhida)* | O app consulta a Wiki como consulta o UEX: cache no IndexedDB, TTL de 7 dias, deduplicação, limitador próprio. | Acompanha os patches sozinho. Na primeira vez que abre o setup de uma nave, precisa de internet. |
| B — pacote no app | Um script baixa os dados da Wiki no build e eles vão dentro do instalador. | Funciona offline, mas fica velho a cada patch até sair nova versão (sem auto-update até a Fase 4). |
| C — misto | Pacote + busca ao vivo. | O dobro do trabalho para pouco ganho: o app já depende do UEX online. |

O usuário escolheu **A** em 2026-11-18.

## 5. Desenho

### 5.1 Abas
Ordem nova: **ROTAS · TRADE · MINERAÇÃO · SALVAGE · NAVES · FROTA · PROGRESSO · AJUSTES**. As abas de atividade vêm primeiro e as de apoio depois (pedido do usuário, 2026-11-18).

- INÍCIO passa a se chamar ROTAS (EN: ROUTES). O conteúdo não muda.
- SALVAGE e FROTA deixam de ficar desabilitadas.
- *Minha decisão:* o hash `#home` antigo continua abrindo ROTAS, para não quebrar atalhos salvos.

### 5.2 Copiar destino
- Ao lado do nome do terminal (componente `TerminalName`, usado em todo o app), um botão pequeno de copiar.
- Copia o **nome do local** onde o terminal fica (`placeName`: estação, cidade ou outpost). Se não houver, copia o nome do terminal, porque a busca do mapa do jogo procura locais.
- Depois de copiar, mostra "Copiado" por ~1,5 s.
- Usa `navigator.clipboard.writeText`. Se falhar, mostra "Não foi possível copiar".
- Tooltip: "Copiar destino: <nome>".

### 5.3 FROTA

**Dados guardados (local, por usuário):**
- Lista de entradas: `id` local, `vehicleId` (UEX), apelido opcional, nota opcional, data em que foi adicionada, setup salvo.
- A mesma nave pode entrar mais de uma vez (ex.: duas Prospector).
- Persistência com o mesmo cuidado do PROGRESSO: gravar com atraso curto e não perder o último texto ao fechar.

**Adicionar:**
- Busca por nome entre todas as naves e veículos do UEX (`vehicles`), incluindo veículos terrestres.

**Lista da frota.** Cada linha mostra:
- nome (e apelido);
- fabricante;
- categoria: as funções pelas flags do UEX (Carga, Mineração, Salvage…) e o papel da Wiki (`role`, ex.: "Medium Mining") quando carregar;
- SCU: o efetivo, respeitando o SCU que o usuário já digitou para essa nave na ROTAS (`scuOverrides`);
- tripulação;
- preço em dólar;
- menor preço em aUEC no jogo;
- onde comprar: abre a janela de loja que já existe na aba NAVES.

**Preço em dólar:**
- `vehicles_prices` do UEX, linha com `currency = USD`.
- Se não houver, usar o `msrp` da Wiki.
- Rotular como "preço de referência (pledge)".

**Totais no topo:** número de naves, soma em dólar, soma em aUEC.
- *Minha decisão:* naves sem preço ficam fora da soma, com aviso de quantas faltam.

**Detalhe da linha:**
- Descrição da Wiki (`description.en_EN`) e foto do UEX.
- Remover pede confirmação.

**Integração com ROTAS:**
- No seletor de nave da ROTAS, as naves da frota aparecem primeiro, num grupo "Minhas naves".

### 5.4 Janela de setup
Abre ao clicar numa nave da frota.

**Funções da nave:**
- Vêm das flags do UEX (`is_mining`, `is_salvage`, `is_tractor_beam`) e do `role` da Wiki.
- Só os encaixes dessas funções aparecem. Tudo de combate fica fora (anti-objetivo).

**Encaixes:**
- Vêm de `/api/v2/vehicles/{uuid}`, campo `ports`, percorrido em árvore. Cada porta tem `name`, `type`, `sub_type`, `sizes.min/max` e `equipped_item` (o item de fábrica).
- Tipos por função:
  - **Mineração:** `WeaponMining` (laser) e, dentro do laser, `MiningModifier` (módulos).
  - **Salvage:** `SalvageHead` e, dentro dela, `SalvageModifier` (scraper e tractor modules).
  - **Tractor:** `TractorBeam`, quando a nave tem a flag de tractor beam.
- Portas de controle, assento, HUD e pods de carga não aparecem.
- Encaixes iguais (ex.: os 3 lasers da Mole) aparecem cada um com seu nome legível ("Laser 1", "Laser 2"…).
- Exemplos reais: a Mole tem 3 encaixes `WeaponMining` com Arbor MH2 de fábrica; a Vulture tem `SalvageHead` S1–2 com Baler e, dentro, 2 encaixes `SalvageModifier` S1.

**Itens que cabem em um encaixe:**
- Itens da Wiki (`/api/v2/items?filter[type]=<tipo>`) com `size` entre `sizes.min` e `sizes.max`.
- Os módulos de um laser escolhido dependem dos encaixes desse laser (`ports` do item; ex.: Arbor MH1 tem 1 encaixe `MiningModifier`). Trocar o laser refaz os encaixes de módulo; os módulos que não cabem mais saem.
- Itens exclusivos de outra nave, que a Wiki ou o UEX marcam como de um veículo específico (ex.: Pitman → Golem), só aparecem para aquela nave.

**Cada item mostra:**
- os atributos principais da Wiki (laser: potência mín–máx, alcance ótimo, nº de módulos, modificadores; módulo: modificadores, ativo ou passivo, usos);
- o menor preço em aUEC e onde comprar, via UEX `items_prices`, casando pelo `uuid` do item. Sem preço no UEX: "sem preço no UEX".

**Setup salvo:**
- Mapa `caminho da porta → uuid do item`, guardado na entrada da frota.
- "Voltar ao de fábrica" limpa.
- Custo total das trocas em aUEC (só itens com preço).

**Builds recomendadas:**
- Por função da nave, cada uma com nome, critério escrito e botão "Aplicar" (preenche o setup; o usuário ainda pode trocar).
- Escolha por regra, para cada encaixe, entre os itens que cabem.
- **Mineração:**
  - "Estável — Quantainium e minérios instáveis": menor instabilidade e maior janela de carga ótima;
  - "Potência — rochas duras": maior potência máxima;
  - "Equilibrada": melhor soma das duas ordens.
- **Salvage:**
  - "Velocidade": maior taxa de raspagem;
  - "Eficiência": maior aproveitamento (menos perda).
- Os atributos exatos que cada regra usa ficam para o construtor, depois de ler o retorno da Wiki. A regra e o nome de cada atributo usado aparecem escritos na build.
- *Minha decisão:* nas builds, módulos ativos (com usos limitados) entram só se melhorarem o critério, e ficam marcados como "ativo".
- Se a nave não tem função de mineração, salvage nem tractor: a janela mostra só descrição e dados, com "Sem setup industrial para esta nave".

**Falhas:**
- Wiki fora do ar ou nave não encontrada pelo `uuid`: a janela mostra o erro com "Atualizar". O resto da FROTA continua com os dados do UEX.

### 5.5 SALVAGE
Subabas:

1. **Materials:** RMC, Construction Materials, Scrap e Waste (commodities do UEX com preço de venda). Mostra melhor venda, lista de terminais com preço, demanda/estoque e data da última atualização, e histórico por terminal, como em Commodities.
2. **Salvage Planner:**
   - nave de salvage (as da frota primeiro, depois todas com `is_salvage`);
   - SCU de cada material, com decimal como no Refine Planner;
   - local atual opcional;
   - saída: terminais que compram, ordenados por valor total ou por distância, com preço, demanda, data e aviso quando a demanda é menor que a carga.
3. **Equipment:**
   - Scraper Beams (cat. 31), Tractor Beams (cat. 67) e Salvage Beams (cat. 110) do UEX, com atributos, preço e lojas;
   - mesmo modelo de tela da Equipment de MINERAÇÃO (tamanho, comparar até 3, janela da loja).
4. **Ships:** naves com `is_salvage` (hoje Reclaimer, Vulture, Fortune, Salvation, MOTH…), com preço em aUEC e onde comprar, como Ground Mining faz com o ROC.

### 5.6 Dados e cache
- Cliente da Wiki no mesmo padrão do UEX:
  - erro tipado;
  - timeout de 20 s;
  - cache IndexedDB;
  - deduplicação;
  - mostrar o cache antigo se der erro.
- TTL de 7 dias para naves e itens da Wiki.
- Limitador próprio da Wiki. *Minha decisão:* ≤ 60/min, porque o limite não é declarado.
- Busca só o necessário: a nave aberta e as listas de itens dos tipos dos encaixes dela.
- "Limpar cache" em AJUSTES limpa também o cache da Wiki.
- `vehicles_prices` do UEX: TTL de 1 dia.

### 5.7 Decisões tomadas após a revisão do design (minhas)
- **A lista da FROTA usa só dados do UEX.**
  - Inclui os preços em dólar. `vehicles_prices` existe e tem o campo `currency`; conferi em 2026-11-18, e a Mole aparece com 315 USD.
  - A Wiki é consultada só para a nave aberta: detalhe ou janela de setup.
  - O `role` da Wiki e o fallback `msrp` aparecem só nessa janela e não entram nos totais. Assim a lista e os totais funcionam com a Wiki fora do ar.
  - O tipo `VehiclePrice` atual é de `vehicles_purchases_prices_all` (aUEC). O preço em dólar ganha um tipo próprio.
- **Funções da nave = encaixes reais.**
  - Uma função (mineração, salvage, tractor) só aparece se a nave tiver encaixes daquele tipo na Wiki.
  - As flags do UEX e o `role` servem só para rotular. Nunca criam nem escondem encaixes.
  - Nave só com tractor: mostra o editor do encaixe, sem builds (não há regra de build para tractor).
  - "Sem setup industrial" vale quando não há nenhum encaixe dos tipos da §5.4.
- **Itens exclusivos de uma nave.**
  - Vale o `id_vehicle` do item no UEX, casado pelo `uuid`. Exemplos: Pitman → Golem, Lawson → ATLS GEO.
  - Se a porta da Wiki tiver `required_tags`, o item precisa ter essas tags.
  - Item sem marcação aparece para qualquer nave em que caiba por tipo e tamanho.
  - Sem lista de exceções escrita à mão.
- **Nave no Salvage Planner:** dá a capacidade (SCU efetivo da nave). O planner só avisa quando a carga digitada passa dessa capacidade. Não limita nem preenche nada.
- **Totais da FROTA:** só o preço base das naves. O custo do setup aparece apenas na janela de setup.

## 6. O que fica para o construtor
- Nomes de arquivos e componentes, seguindo `src/features/<aba>/` e `src/domain/`.
- Os atributos exatos de cada regra de build (§5.4), desde que apareçam escritos na build.
- Como mostrar a árvore laser → módulos (aninhada ou em grupos).
- Textos PT/EN novos no dicionário.
- Testes: funções de domínio com testes unitários (filtro de encaixes por função, itens que cabem, builds, totais da frota, preço USD com fallback) e telas com Testing Library, como nas fases anteriores.

## 7. Backlog que entra nesta fase
- Renomear INÍCIO → ROTAS; PROGRESSO na penúltima posição (§5.1).
- "Copiar destino" (§5.2). A ideia do macro sai do backlog.
