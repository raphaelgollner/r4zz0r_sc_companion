# Rotas: lista "Evitar" e card em destaque (design curto)

## Por quê
O jogador quer a melhor rota de compra e venda sem passar por lugares que não quer visitar, como "nada em Nyx nem em Pyro" ou "só Stanton, sem Crusader". Hoje só dá para escolher o sistema de **origem**, e só na aba TRADE. Além disso, no card da rota os nomes das estações são pequenos (13 px, cinza) e ficam perdidos, embora sejam a informação mais importante junto com a mercadoria e os preços.

## Objetivos
- Uma lista "Evitar" que aceita sistemas, planetas e lugares (lua, estação, cidade, posto). Uma rota é descartada se a compra **ou** a venda cair em algo dessa lista.
- A lista fica salva (prefs) e aparece em ROTAS e em TRADE › Rotas, compartilhada entre as duas telas.
- No card, cada estação ganha uma linha própria em destaque, e os preços por SCU ficam em negrito.

## Fora do escopo
- Modo "só incluir". "Só Stanton" se faz evitando Nyx e Pyro.
- Mudar o filtro "Sistema de origem", que continua como está na aba TRADE.
- Layout mobile ou APK, que ficaram para depois.

## Abordagens
- **Lista "Evitar"** (escolhida pelo usuário): busca mais etiquetas removíveis. É compacta e cabe no painel de ROTAS.
- **Árvore com caixas** (descartada): mostra tudo de uma vez, mas é longa demais para o painel compacto.

## Como funciona
- Hierarquia: a mesma de `buildLocationTree`, ou seja, sistema › planeta › lugar, onde lugar = `moon_name || space_station_name || city_name || outpost_name`. Conferido no UEX: tudo em volta de Crusader (luas, CRU-L1/L4/L5, Orison, GrimHEX, Seraphim) vem com `planet_name = 'Crusader'`. Por isso, evitar Crusader remove tudo isso.
- Um item evitado é `{ system, planet?, place? }`, guardado em `Prefs.avoid` (padrão `[]`). Um terminal casa com um item se o sistema bate e, quando o item tiver planeta e lugar, eles também batem.
- Um terminal que não está no mapa de terminais nunca é excluído (sem dado, sem filtro).
- As opções da busca vêm dos terminais de commodity: cada sistema, planeta e lugar aparece uma vez, com uma legenda do tipo "planeta · Stanton". Itens já evitados somem da busca.
- As etiquetas mostram o nome com ×. O × tem rótulo acessível "Remover X".

## Card
```
LARANITE                                  ≈ 412.000 aUEC · ROI 38%
COMPRA  Lorville CBD ⧉                  (16 px, branco, negrito)
        2.150 /SCU · estoque 1.200 SCU · há 2h
LEVA    696 SCU (limite: nave) = 1.496.400 aUEC
VENDE   ARC-L1 Wide Forest ⧉            (16 px, branco, negrito)
        2.830 /SCU · demanda 900 SCU · há 5h
```
- Cabeçalho: a mercadoria em 18 px à esquerda e o lucro e o ROI à direita. A linha LUCRO do rodapé sai, porque o valor já está no cabeçalho.
- A antiga linha `compra → venda` do cabeçalho sai, porque cada estação já tem sua própria linha.

## Decisões do construtor
- O nome dos rótulos de UI ("Evitar", "Adicionar lugar a evitar…") e a cor exata ficam a critério de quem implementa, seguindo o tema.
