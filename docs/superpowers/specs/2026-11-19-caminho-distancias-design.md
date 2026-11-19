# Routes: CAMINHO e REDUZIR DISTÂNCIAS (design)

## Por quê
O jogador quer encadear trocas para nunca voar vazio: o lugar de venda de um trecho é o lugar de compra do próximo (A → B → C → D), mesmo que algum trecho dê pouco. Ele também quer priorizar rotas curtas com bom lucro.

## Decisões aprovadas
**CAMINHO** (caixa no filtro de Routes):
- **"Começar em"** é opcional (terminal). Vazio = o app escolhe o ponto de partida.
- **Trechos**: 2 a 8, padrão 4.
- **Escolha**: busca em feixe pelo **maior lucro somado**, sem guloso. O dinheiro passa de um trecho ao outro (orçamento + lucro).
- **Filtros**: Evitar, Risco máximo, ilegais, ocultas e SCU da nave. "Sistema de origem" vale só para o primeiro trecho e é ignorado se houver "Começar em".
- **Repetição**: o mesmo terminal pode se repetir, mas o mesmo trecho (mercadoria + compra + venda) não se repete no caminho.
- **Resultado**: 3 caminhos alternativos, cada um com um primeiro trecho diferente. Cada trecho é um RouteCard com a etiqueta "N de M". O total aparece no topo de cada caminho.
- **Caminho curto**: se não der para completar o número de trechos, o caminho termina antes e avisa.

**REDUZIR DISTÂNCIAS** (caixa no filtro):
- **Lista normal**: o app busca a distância (UEX `terminals_distances`, cache 7 dias) das 30 rotas mais lucrativas e ordena por **lucro por Gm** = lucro / max(distância, 1). Rotas sem distância vão ao fim, por lucro. O card mostra "X Gm · Y aUEC/Gm".
- **Com CAMINHO**: em cada trecho, o app olha as 5 melhores opções que saem dali e escolhe pelo lucro por Gm (guloso, porque a busca em feixe exigiria centenas de consultas). O primeiro trecho de cada um dos 3 caminhos é escolhido entre as 30 rotas mais lucrativas, também por lucro por Gm.
- **Enquanto carrega**: a lista aparece pelo lucro e se reorganiza quando as distâncias chegam.
- **Aviso**: distância em Gm não é tempo de voo.

## Fora do escopo
- Voltar ao ponto de partida.
- Tempo de voo.
- Distância entre trechos (é zero: a venda e a compra seguinte acontecem no mesmo terminal).

## Calls do construtor
- Feixe: largura 12, 6 opções expandidas por estado.
- Ordem dos caminhos: os completos primeiro, depois por lucro total.
- Preferências novas em `Prefs`: `pathMode`, `shortDistances`, `pathStart`, `pathLegs`.
- "Ver ocultas" mostra a lista de ocultas normal mesmo com CAMINHO ligado.

## Adendo: ROTATIVO / ROUNDABOUT
Pedido durante a execução: o filtro "ROTATIVO" (EN "ROUNDABOUT"), que vai e volta A > B > A > B enquanto houver estoque.
- **Exclusividade**: CAMINHO e ROTATIVO são caixas que se excluem. As preferências viram `routeMode: 'list' | 'path' | 'roundabout'`.
- **Pares**: o par (A, B) só conta se houver trecho lucrativo nos dois sentidos, para nunca voar vazio. Cada trecho escolhe a melhor mercadoria daquele sentido com o estoque e a demanda que **sobraram**: o que já foi comprado num terminal sai do estoque dele, e o que foi vendido sai da demanda.
- **Fim**: o rotativo segue até faltar estoque/demanda ou lucro em algum sentido, com teto de 10 trechos (5 voltas). Com estoque desconhecido, para no teto e avisa.
- **Começar em**: com "Começar em", A é esse terminal. Sem ele, os pares candidatos saem das 40 rotas mais lucrativas.
- **Resultado**: 3 rotativos com pares diferentes, ordenados pelo lucro total, cada um com os trechos numerados como no CAMINHO.
- **Com REDUZIR DISTÂNCIAS**: ordena pelo lucro total ÷ (distância A↔B × número de trechos), buscando a distância dos 15 melhores pares.
- **Desconto no CAMINHO**: o mesmo desconto de estoque e demanda vale lá também.
