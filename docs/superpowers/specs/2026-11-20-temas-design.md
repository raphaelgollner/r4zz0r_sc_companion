# Temas de cor (design curto)

**Por quê:** permitir trocar a paleta mantendo todo o design, com temas que lembram as atividades (mineração, salvage, carga), estilos divertidos e empresas/facções do jogo.

**Aprovado pelo usuário:**
- Seção **Tema** em AJUSTES, com amostras clicáveis; a troca é na hora e fica salva.
- Temas: TAYKO CARGO (padrão = atual), TAYKO MINER (vermelho-brasa), TAYKO SALVAGE (azul-laser), SLIME (verde-ácido), PINKY WINKY (rosa), DRAKE (amarelo-alerta + ferrugem, grafite), RSI (azul + branco-gelo, marinho), ARGO (laranja industrial + amarelo, chumbo).
- Extras: AEGIS (aço + vermelho militar), ANVIL (oliva + areia), ORIGIN (champanhe + prata), CRUSADER (azul-céu + branco), MISC (teal), NINE TAILS (roxo neon + rosa).
- Cores com significado não mudam em nenhum tema: lucro e prejuízo, níveis de perigo e as marcações.
- Logo tingido com o tom do tema (filtro CSS).

**Como:**
- `src/ui/themes.ts` define cada tema como valores das variáveis CSS: `--gold`, `--gold-light`, `--gold-dark`, `--orange`, `--orange-light`, `--accent`, `--black`, `--panel`, `--gold-rgb`, `--orange-rgb`, `--panel-rgb` e `--logo-filter`.
- `applyTheme(id)` grava essas variáveis no `:root`. Um id desconhecido cai no padrão.
- As cores fixas do CSS passam a usar `rgba(var(--gold-rgb), x)` e equivalentes.
- `Prefs.theme` guarda o tema (saneado). O tema é aplicado antes do primeiro render para não piscar e depois a cada troca.

**Fora do escopo:** temas claros, fontes, logos de empresas.
