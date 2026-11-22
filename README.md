# Tayko Corp Companion

Companion para te auxiliar nas atividades envolvendo comércio, mineração e salvage dentro do Star Citizen.

- **TRADE:** rotas de compra e venda (lista, CAMINHO, ROTATIVO, REDUZIR DISTÂNCIAS), filtros de lugares, nível de perigo e doca de carga externa; preços, terminais e índice de moedas.
- **MINERAÇÃO e SALVAGE:** onde achar, onde vender, quanto rende.
- **NAVES e FROTA:** dados das naves e da sua frota.
- **INÍCIO:** registro das suas compras, vendas e sessões.
- Interface em PT-BR e EN, com temas de cores.

Dados: [UEX Corp](https://uexcorp.space) e [Star Citizen Wiki](https://star-citizen.wiki).

## Baixar

Instalador para Windows na página [Releases](../../releases). Antes de instalar, veja **[SEGURANCA.md](SEGURANCA.md)**: o que o app acessa e como conferir que o instalador saiu deste código.

## Desenvolver

```powershell
npm ci
npm test
npx tauri dev
```

Requer Node.js e Rust. Stack: Tauri 2, React 19, TypeScript, Vite, Vitest.

## Licença

[GNU GPL v3](LICENSE).

Star Citizen® é marca registrada da Cloud Imperium Games. App não oficial, desenvolvido de forma independente por [Raphael Gollner](https://raphaelgollner.github.io/).
