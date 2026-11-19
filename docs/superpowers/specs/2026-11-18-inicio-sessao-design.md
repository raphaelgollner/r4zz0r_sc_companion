# 0.5.0 — INÍCIO de sessão, marcações nas rotas e reorganização (design)

## Por quê
Usando o app na prática, o usuário percebeu três coisas:
- A aba ROTAS repete TRADE › Routes.
- A aba que ele mais usa durante o jogo é o controle de dinheiro e sessão (PROGRESSO).
- Faltam duas memórias da sessão: **o que** ele comprou e vendeu, e **onde**.

Ele também chegou a uma rota de Quartz que prometia muito estoque, mas só tinha 16 SCU (dado de 3 dias atrás). Queria poder marcar isso na rota.

## Objetivos
1. **Abas**: ROTAS sai. A ordem fica `INÍCIO · TRADE · MINERAÇÃO · SALVAGE · NAVES · FROTA · AJUSTES`. INÍCIO é a antiga PROGRESSO e abre por padrão.
2. **TRADE**: Routes passa a ser a primeira subaba e a padrão: `Routes · Commodities · Locations · Harvestables · Price Finder · Currencies Index`.
3. **INÍCIO**:
   - Sai a seção Perfil.
   - Transações ganham **Recurso** (commodity), **Local** (terminal), **SCU** e **Preço/SCU**. Todos são opcionais.
   - Resumo da sessão com **lucro por recurso** e **lugares visitados**.
   - Botão **LIMPAR DADOS** com janela de confirmação.
4. **Marcações nas rotas** (TRADE › Routes):
   - Uma rota pode ter várias marcações ao mesmo tempo.
   - **OCULTAR** tira a rota da lista.
   - "Ver ocultas (N)" lista as rotas ocultas.
5. **AJUSTES**: recebe o painel "Dados salvos" (idade de cada recurso do UEX + "Atualizar tudo") na coluna direita.
6. **Currencies Index**: explicação completa na própria tela.
7. **Banner**: link para o site da org (`https://tayko.org`) à esquerda do seletor de idioma, abrindo no navegador do sistema.
8. **Versão 0.5.0**.

## Fora do escopo
- Lançar transações automaticamente a partir da rota. O usuário prefere lançar à mão, porque o estoque real difere do UEX.
- APK.
- Assinatura e auto-update.

## Anti-objetivos
- Perder dados de progresso já salvos (transações antigas sem recurso e sem local continuam válidas).
- O LIMPAR DADOS apagar a frota, as preferências, as marcações ou o cache.

## Abordagens
- **Marcações**: o salvamento acompanha o padrão de `prefs`/`salvagePrefs` (localStorage + `useSyncExternalStore`). A alternativa seria IndexedDB, como a frota. O volume de dados é pequeno e a leitura precisa ser síncrona na lista de rotas, por isso localStorage.
- **Ocultas fora do cálculo**: a rota oculta é filtrada **dentro** de `computeRoutes`, antes do limite de 50, para a lista continuar cheia. A alternativa de filtrar depois deixaria a lista com menos de 50.
- **Nomes guardados junto**: a transação guarda o nome do recurso e do local no momento do lançamento. Assim o histórico aparece mesmo sem UEX carregado ou se o item sair da lista do UEX.

## Marcações — regras
- **Chave da rota**: `${commodityId}:${idTerminalCompra}:${idTerminalVenda}`.
- **Tipos**:
  - Expiram com dado novo: `done` (FEITO), `lowStock` (ESTOQUE MENOR), `noDemand` (DESTINO NÃO COMPRA), `priceOff` (PREÇO DIFERENTE).
  - Fixas: `danger` (PERIGOSO), `hidden` (OCULTAR).
- **Registro salvo**: `{ marks: MarkKind[], buyAt, sellAt, commodityName, buyName, sellName }`.
  - `buyAt` e `sellAt` são o `date_modified` dos preços no momento em que a marcação foi feita.
  - Os nomes servem para listar ocultas que já não aparecem no cálculo.
- **Expiração**:
  - Uma marcação que expira é ignorada se o `date_modified` atual da compra for maior que `buyAt`, ou o da venda for maior que `sellAt`.
  - Ela é apagada do registro na próxima gravação dessa rota.
  - Marcar de novo atualiza `buyAt` e `sellAt`.
- **Na tela**:
  - Cada card mostra as marcações válidas como etiquetas.
  - Um menu "Marcar" no card tem uma caixa por tipo.
  - Rotas com OCULTAR somem da lista normal.
  - O botão "Ver ocultas (N)" alterna para a lista só de ocultas, onde N = rotas com OCULTAR salvas.
  - Na lista de ocultas, as que ainda calculam aparecem como card e as demais aparecem numa lista simples (mercadoria, compra → venda) com "Mostrar de novo".
  - Desmarcar tudo apaga o registro.
- **Chave salva**: `tayko.routeMarks`. Dado malformado = sem marcações.

## INÍCIO — regras
- **Tx ganha campos opcionais**: `commodityId`, `commodityName`, `terminalId`, `terminalName`, `scu`, `pricePerScu`.
- **Formulário**:
  - Recurso: busca nas commodities do UEX.
  - Local: busca em todos os terminais do UEX, com legenda do lugar.
  - SCU e Preço/SCU.
  - Quando SCU e preço são válidos, o Valor é preenchido com `scu × preço`, e o usuário pode editar o Valor depois.
  - Se o UEX não carregou, os campos de busca ficam desabilitados e o resto funciona.
  - O botão × limpa o recurso ou o local escolhido.
  - A descrição continua existindo.
- **Tabela de transações**: ganha as colunas Recurso e Local (com "—" quando vazio).
- **Resumo da sessão**: vale para a sessão selecionada na tabela de Sessões ou, se nenhuma estiver selecionada, para a sessão ativa. Tem duas partes:
  - **Por recurso**: recurso, SCU comprado, SCU vendido, líquido (soma dos valores), em ordem de líquido decrescente.
  - **Lugares visitados**: local, e o que foi feito ali ("Comprou Quartz · Vendeu Gold"), em ordem do primeiro lançamento.
- **LIMPAR DADOS**:
  - Abre uma janela: "Todos os dados salvos no INÍCIO (saldo, transações e sessões) serão perdidos. Isso não pode ser desfeito."
  - Botões Limpar e Cancelar.
  - Confirmar zera o progresso (`EMPTY_PROGRESS`).
  - Não mexe em frota, preferências, marcações nem cache.
- O perfil salvo (nome e foto) continua no dado, mas não aparece mais.

## AJUSTES
O layout passa a ter duas colunas:
- **Esquerda**: o que existe hoje.
- **Direita**: "Dados salvos", com a mesma tabela e o mesmo botão que estavam em ROTAS.

A tela de AJUSTES dispara o carregamento de todos os recursos para mostrar a idade de cada um, como ROTAS fazia.

## Link da org
- Usa `tauri-plugin-opener` (`openUrl`) com a permissão `opener:default`.
- Fora do Tauri (testes e navegador), cai em `window.open`.
- Texto do link: `TAYKO.ORG`.

## Decisões do construtor (calls)
- Chave interna da aba: `home` passa a renderizar o INÍCIO (progresso). A chave `progress` deixa de existir. `#progress` cai no padrão (INÍCIO).
- `RouteControls` perde a prop `compact`, que só ROTAS usava.
- `features/home` é removida.
- Textos exatos dos rótulos ficam a cargo do construtor (PT-BR/EN), seguindo o tom atual.
- Self-check no lugar do builder check: o usuário pediu execução direta sem perguntas.

## Adendo (pedido durante a execução): nível de perigo dos terminais
Pedido: mostrar nos cards de Routes e onde houver estação um nível **SEGURO** (verde), **MEDIANO** (azul), **ARRISCADO** (laranja) ou **PERIGOSO** (vermelho), pela segurança do sistema e presença da lei; usar também no filtro; avisar que é estimativa e pode não refletir o momento.

Fonte: o UEX dá `faction_name` por terminal (sistema não traz jurisdição). Regras (`riskOf(t)`):
- Facção hostil (Nine Tails, Headhunters, XenoThreat, Dusters, Rough & Ready) → PERIGOSO.
- UEE em Stanton, cidade ou estação espacial → SEGURO; UEE em posto/lua de Stanton ou fora de Stanton → MEDIANO.
- Citizens For Prosperity, People's Alliance → ARRISCADO.
- Sem facção: Stanton → MEDIANO; Nyx → ARRISCADO; Pyro e outros → PERIGOSO.
- Terminal desconhecido → sem nível (nunca filtrado).

Na tela: etiqueta colorida ao lado do nome em `TerminalName` (todas as listas com terminal) e nas linhas de compra/venda do card, com `title` explicando a base (facção) e o aviso. Filtro em Routes: "Risco máximo" (Qualquer / até Arriscado / até Mediano / só Seguro), salvo em prefs (`maxRisk`), aplicado à compra e à venda, com o aviso de estimativa abaixo.

Call: a marcação manual `danger` passa a se chamar **HOSTIL** (pirataria/interdição que você encontrou), para não confundir com o nível PERIGOSO calculado.
