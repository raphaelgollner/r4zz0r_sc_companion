# Doca de carga externa nas rotas (design curto)

**Por quê:** a HULL-C só carrega em estação com doca de carga externa, e a busca sugeria lugares onde ela nem consegue carregar.

**Aprovado pelo usuário:**
- Nave que só carrega em doca externa (UEX `vehicles.is_loading_dock = 1`; hoje a Hull C) → ROUTES usa só terminais com `terminals.has_loading_dock = 1`, na compra e na venda, na lista, no CAMINHO, no ROTATIVO e no REDUZIR DISTÂNCIAS.
- Automático ao escolher a nave, com linha nos controles ("Hull C: só estações com doca de carga externa (13)") e interruptor para desligar (UEX pode estar desatualizada).
- Selo "DOCA EXTERNA" nos terminais com doca, nos cards.
- Versão 0.9.0.

**Abordagens:** (1) filtro dentro de `routeFilters().avoided`, que lista, caminhos e rotativo já usam — escolhida, um ponto só; (2) pré-filtrar os preços antes da busca — duplicaria lógica e perderia o "Começar em" evitado; (3) só avisar no card — não resolve a busca.

**Como:**
- `RouteInput.dockOnly?: boolean`; `avoided(id)` também é verdadeiro quando `dockOnly` e o terminal não tem doca (terminal desconhecido conta como sem doca).
- `Prefs.dockFilter: boolean` (padrão `true`, saneado). `dockOnly = ship.is_loading_dock === 1 && prefs.dockFilter`.
- Interruptor e contagem só aparecem para naves que precisam da doca.
- Selo (minha decisão): aparece só quando a nave escolhida precisa da doca; para as outras naves seria ruído.

**Fora do escopo:** limite de tamanho de container (`max_container_size`), tamanho de pad.
