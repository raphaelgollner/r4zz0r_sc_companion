# Tayko Corp Companion — Ajustes de uso + Fase 2 (MINERAÇÃO)

Data: 2026-11-18 · Status: aguardando aprovação · Base: `2026-11-17-tayko-companion-design.md`, `docs/BACKLOG.md`

## Por quê
O usuário aprovou a versão 0.2.0 e pediu: (1) os ajustes de uso anotados no backlog, começando pelo tooltip cortado; (2) a aba MINERAÇÃO, um dos focos da org.

## Parte A — Ajustes de uso (do backlog)
1. **Tooltip nunca cortado:** a dica é desenhada num portal no `document.body` com `position: fixed`, posicionada pelo `getBoundingClientRect()` do alvo; abre para baixo quando não há espaço em cima e não passa das bordas da janela.
2. **SCU vazio = SCU do UEX:** apagar o campo remove o SCU digitado (em vez de gravar 0). Decimais são arredondados só ao sair do campo.
3. **"Usar meu saldo" com saldo ≤ 0:** botão desabilitado, com dica "Seu saldo está zerado ou negativo".
4. **Botão "Atualizar" em cada tela** (força nova busca dos recursos daquela tela, respeitando o limite).
5. **Histórico de preços** no detalhe de Commodities: gráfico de linha de compra/venda média ao longo do tempo (`commodities_prices_history`; se o endpoint não trouxer dados úteis, o item é cortado e registrado).
6. **Mensagens de erro claras:** distinguir "sem conexão", "limite de consultas do UEX" e "UEX com problema" no aviso de dados salvos; "Limpar cache" avisa se falhar.
7. **Técnico:** gravar o PROGRESSO com atraso de 400 ms; `.gitattributes` com LF e normalização; CSP do Tauri limitada a `api.uexcorp.uk` + imagens `assets.uexcorp.space`; INÍCIO lista também os recursos de preço de naves no painel de cache.

## Parte B — Aba MINERAÇÃO (fase 2)

### Dados confirmados no UEX (2026-11-18)
- `refineries_yields`: 20 refinarias × 24 minérios, `value` = bônus/penalidade de rendimento em % por minério e refinaria.
- `refineries_methods`: 9 métodos com notas 1–3 de rendimento, custo e velocidade (sem números exatos).
- `refineries_capacities`: % de capacidade estimada por refinaria.
- `commodities_raw_prices_all`: ~340 preços de venda de minério **bruto** por terminal.
- `items` + `items_prices` + `items_attributes` nas categorias **Mining Laser Heads (29)**, **Mining Modules (30)** e **Gadgets (28)**: 17 lasers com atributos reais (tamanho, potência min–max, potência de extração, alcance ótimo/máximo, instabilidade, resistência, nível de inerte, janela de carga, slots de módulo) e onde comprar.
- `terminals_distances` com origem + destino: distância em Gm entre dois terminais (uma chamada por par).
- Gemas de solo (Hadanite, Aphorite, Dolivine, Janalite, Beradom, Feynmaline…) com venda em `commodities_prices_all` e "onde aparece" em `ids_planets/ids_moons`.

### Subabas
- **Ores:** cada minério com valor bruto (melhor venda em `commodities_raw_prices_all`), valor refinado (melhor venda da commodity refinada correspondente — mesmo nome sem "(Raw)"/"(Ore)"), diferença em %, onde aparece, e tooltip com os melhores terminais.
- **Refineries:** tabela refinaria × minério com o bônus (verde positivo / vermelho negativo), filtro por minério, capacidade e localização (tooltip); quadro dos 9 métodos com as notas traduzidas (Rendimento/Custo/Velocidade: baixo/médio/alto).
- **Refine Planner:** o usuário monta a carga (vários minérios, SCU de cada) e escolhe o **local atual** (qualquer terminal, com busca). Para cada refinaria: bônus médio ponderado da carga, **valor refinado estimado** = Σ SCU × melhor preço do refinado × (1 + bônus/100), distância do local atual (Gm) e localização. Ordena por valor (padrão) ou distância. Texto fixo explica: "Estimativa: não inclui o rendimento do método nem a taxa da refinaria, que o UEX não informa." Mostra também a alternativa **vender bruto** (melhor preço bruto) para comparar.
- **Equipment:** lasers, módulos e gadgets com fabricante, tamanho, atributos principais em colunas (lasers: potência, extração, alcance ótimo, instabilidade, resistência, inerte, janela de carga, slots), menor preço e "onde comprar" (abre a mesma janela de loja com localização). Filtro por tamanho (S0/S1/S2) e busca. Comparar até 3 lado a lado.
- **Ground Mining:** gemas de solo com melhor venda, onde aparecem e preço; veículos ROC/ROC-DS (`is_ground_vehicle` + `is_mining`) com onde comprar/alugar.

### Distância
- `terminals_distances` é chamado só para os pares necessários (local atual × 20 refinarias), em cache por 7 dias (distâncias não mudam) e respeitando o limite de consultas. Falha numa distância mostra "—" e não impede o resto.

## Não-objetivos
- Laser necessário por rocha, spawn por rocha, cálculo de quebra de rocha (UEX não tem).
- Valor exato com rendimento por método/taxa da refinaria (UEX não informa).
- MINERAÇÃO em sessões do PROGRESSO (o usuário já pode lançar manualmente com categoria Mineração).

## Anti-objetivos
- Mostrar número inventado como se fosse do UEX (toda estimativa é rotulada).
- Disparar dezenas de consultas a cada mudança no Refine Planner.

## Deixado para quem constrói
Layout exato, quais atributos de módulos/gadgets viram colunas (os que existirem), formato do gráfico de histórico.
