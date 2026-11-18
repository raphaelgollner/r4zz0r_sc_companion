# Backlog — próximas fases

Itens anotados para a próxima fase de desenvolvimento.

## Próxima fase

### Tooltip cortado dentro dos cards e painéis
- **Onde:** INÍCIO e TRADE › Routes, ao passar o mouse no nome dos terminais de um card de rota (ex.: "Chawla's Beach → Ashland"). A dica aparece cortada pela borda de cima do card.
- **Causa provável:** os cards (`.route-card`) e painéis (`.panel`) usam `clip-path` para os cantos chanfrados, e o `clip-path` corta tudo o que sai da caixa, inclusive a dica (`.tip-box`, posicionada acima do elemento).
- **Correção proposta:** desenhar a dica fora da árvore do card, num portal no `document.body` com `position: fixed`, calculando a posição pelo `getBoundingClientRect()` do alvo. A dica também deve abrir para baixo quando não houver espaço em cima e não passar da borda da janela.
- **Pronto quando:** em INÍCIO, Routes, Commodities, NAVES e na janela da loja, nenhuma dica aparece cortada, inclusive nas primeiras linhas e nos cards do topo.

### Pendências menores da revisão (ajustes + PROGRESSO)
- Apagar o campo SCU grava 0 até clicar em "↺ usar SCU do UEX"; campo vazio deveria remover o SCU digitado. Digitar SCU com decimal é reescrito enquanto digita.
- "Usar meu saldo" com saldo ≤ 0 põe 0 no dinheiro sem explicar; desabilitar o botão com uma dica.
- O progresso é gravado a cada tecla (nome do perfil); gravar com um pequeno atraso.
- Alguns arquivos ficaram com quebra de linha CRLF; adicionar `.gitattributes` (`* text=auto eol=lf`) e normalizar.
- Ao editar um lançamento sem mudar a data, os segundos são perdidos (o campo de data só guarda minutos).

### Pendências menores da fase 1
- Botão "atualizar" em cada tela (hoje só há "Atualizar tudo" no INÍCIO).
- Histórico de preços no detalhe de Commodities.
- Aviso de dados salvos diz "Sem conexão" também quando o motivo é limite de consultas ou erro do servidor.
- "Limpar cache" não avisa se falhar.
- Tela INÍCIO não lista no cache os preços de compra e aluguel de naves.
- Política de segurança (CSP) do Tauri está desligada; limitar a `api.uexcorp.uk` e ao servidor de imagens.

## Fases seguintes (do design original)
- **Fase 2 — MINERAÇÃO:** Ores, Refineries, Refine Planner, Equipment, Ground Mining.
- **Fase 3 — FROTA e SALVAGE.**
- **Fase 4 — Distribuição:** instalador assinado e atualização automática.
