# Backlog — próximas fases

Itens anotados para as próximas fases de desenvolvimento.

## Feito na versão 0.4.0
- Abas: INÍCIO virou ROTAS; ordem ROTAS · TRADE · MINERAÇÃO · SALVAGE · NAVES · FROTA · PROGRESSO · AJUSTES.
- Botão "Copiar destino" ao lado do nome de cada terminal (copia o nome do local para colar no mapa do jogo).
- FROTA: lista pessoal de naves e veículos com preço em dólar e aUEC, SCU, categoria, onde comprar e totais; naves da frota primeiro na escolha de nave da ROTAS.
- Janela de setup com dados da Star Citizen Wiki: encaixes industriais reais, itens que cabem, builds recomendadas (Estável, Potência, Equilibrada; Velocidade, Eficiência) e custo das trocas.
- SALVAGE: Materials, Salvage Planner, Equipment e Ships.

## Feito na versão 0.3.0
- Tooltip em portal, nunca cortado.
- Campo SCU vazio volta ao SCU do UEX; "Usar meu saldo" desabilitado com saldo ≤ 0.
- Botão "Atualizar" em cada tela; histórico de preços por terminal em Commodities.
- Mensagens de erro por tipo (sem conexão / limite / erro do UEX); aviso quando "Limpar cache" falha.
- PROGRESSO grava com atraso e não perde o último texto ao fechar.
- Quebras de linha LF (`.gitattributes`); CSP do Tauri ligada.
- Fase 2 — MINERAÇÃO: Ores, Refineries, Refine Planner, Equipment, Ground Mining.

## Pendências menores
- Ao editar um lançamento sem mudar a data, os segundos são perdidos (o campo de data só guarda minutos).
- Na janela de loja de equipamentos, só aparecem os itens da categoria aberta (Lasers, Módulos ou Gadgets).
- Os campos de busca (minério, local, nave) não funcionam com as setas do teclado.
- As linhas clicáveis das tabelas só funcionam com o mouse.
- O botão "Atualizar" do Refine Planner não refaz a busca das distâncias.

## Fases seguintes
- **Fase 4 — Distribuição:** instalador assinado e atualização automática.
