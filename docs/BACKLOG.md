# Backlog — próximas fases

Itens anotados para as próximas fases de desenvolvimento.

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

## Ajustes para a Fase 3
- Renomear a aba INÍCIO para "ROTAS" (PT) / "ROUTES" (EN).
- Mover a aba PROGRESSO para a penúltima posição, logo antes de AJUSTES.

## Ideias em avaliação
- Botão "traçar rota no mapa do jogo": o companion alternaria para o Star Citizen, abriria o mapa (F2), buscaria o destino e marcaria a rota.

## Fases seguintes (do design original)
- **Fase 3 — FROTA e SALVAGE:** lista pessoal de naves usada nas calculadoras; onde vender RMC/Construction Materials e calculadora para naves de salvage.
- **Fase 4 — Distribuição:** instalador assinado e atualização automática.
