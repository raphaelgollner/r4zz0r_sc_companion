# Segurança / Security

*English below.*

## O que o app faz e o que não faz

O Tayko Corp Companion é um app de desktop (Tauri) que mostra dados públicos do Star Citizen. Tudo abaixo pode ser conferido no código deste repositório.

| | |
|---|---|
| **Conexões de rede** | Só `api.uexcorp.uk` (preços, terminais, naves), `api.star-citizen.wiki` (dados de naves e itens) e `assets.uexcorp.space` (imagens). A regra de segurança do app (CSP, em [`src-tauri/tauri.conf.json`](src-tauri/tauri.conf.json)) bloqueia qualquer outro endereço. |
| **Permissões do sistema** | As básicas do Tauri, abrir links no navegador (TAYKO.ORG e o site do desenvolvedor) e abrir a janela de escolher pasta do Windows (para a importação do Game.log). Veja [`src-tauri/capabilities/default.json`](src-tauri/capabilities/default.json). |
| **Arquivos do PC** | Só o Game.log, e só para ler (nunca grava, move ou apaga): na importação (OVERLAY › IMPORTAÇÃO), quando você clica em IMPORTAR ou Atualizar, lê o `Game.log` e os `.log` da subpasta `logbackups` da pasta do jogo que você escolheu; com uma sessão do OVERLAY iniciada, lê a cada 5 segundos só o trecho novo do `Game.log`, e para quando você encerra a sessão. Nenhum outro arquivo é lido. O código está em [`src-tauri/src/gamelog.rs`](src-tauri/src/gamelog.rs). |
| **Comandos** | Não roda programas nem comandos. |
| **Conta, login, senha** | Não existem. Nenhuma senha, token ou chave de API é pedida ou guardada. |
| **Seus dados** | Preferências, frota, registros e o que foi importado do Game.log ficam só no seu PC, dentro do app. Nada do Game.log é enviado; para mostrar o nome das mercadorias, o app consulta na Star Citizen Wiki apenas o código público de cada mercadoria. |
| **Telemetria** | Nenhuma. |

Se alguma dessas regras mudar, a mudança será anunciada nas notas da versão e nesta página. Últimas mudanças: versão 0.10.0, leitura do `Game.log` para a importação; versão 0.11.0, leitura ao vivo do `Game.log` durante uma sessão do OVERLAY.

## Como conferir o instalador

Os instaladores da página [Releases](../../releases) são gerados pelo **GitHub Actions** a partir deste código ([`.github/workflows/release.yml`](.github/workflows/release.yml)), não no PC de ninguém.

1. **Hash SHA-256**: confira se o arquivo baixado é o publicado. No PowerShell:

   ```powershell
   Get-FileHash ".\Tayko.Corp.Companion_0.11.1_x64-setup.exe"
   ```

   O resultado deve ser igual ao do `SHA256SUMS.txt` e ao das notas da versão.

2. **Atestado de origem**: prova que o instalador saiu deste repositório, deste código, pelo GitHub Actions. Com o [GitHub CLI](https://cli.github.com/):

   ```powershell
   gh attestation verify ".\Tayko.Corp.Companion_0.11.1_x64-setup.exe" --repo raphaelgollner/r4zz0r_sc_companion
   ```

3. **Antivírus**: cada versão é enviada ao [VirusTotal](https://www.virustotal.com/); o link do relatório fica nas notas da versão. Como o app ainda não tem assinatura de código, um ou outro antivírus pode dar um alerta genérico, e o Windows mostra o aviso azul do SmartScreen ("Mais informações" → "Executar assim mesmo").

4. **Compilar você mesmo**: com Node.js e Rust instalados, `npm ci` e `npx tauri build`.

---

## What the app does and does not do

Tayko Corp Companion is a desktop app (Tauri) that shows public Star Citizen data. Everything below can be checked in this repository's code.

- **Network:** only `api.uexcorp.uk`, `api.star-citizen.wiki` and `assets.uexcorp.space` (images). The app's Content Security Policy in `src-tauri/tauri.conf.json` blocks every other address.
- **System permissions:** Tauri's defaults, opening links in your browser, and the Windows folder picker for the Game.log import (`src-tauri/capabilities/default.json`).
- **Files:** only Game.log, read-only (never written, moved or deleted): for the import (OVERLAY › IMPORT), when you click IMPORT or Refresh, it reads `Game.log` and the `.log` files in `logbackups` inside the game folder you chose; while an OVERLAY session is running, it reads only the new part of `Game.log` every 5 seconds and stops when you end the session. No other file is read (`src-tauri/src/gamelog.rs`). **Commands:** runs none.
- **Account, login, password:** none. No password, token or API key is asked for or stored.
- **Your data:** stays on your PC, inside the app, including what was imported from Game.log. Nothing from Game.log is sent; to show commodity names, the app looks up only each commodity's public game code on the Star Citizen Wiki. **Telemetry:** none.

Any change to these rules will be announced in the release notes and on this page. Latest changes: version 0.10.0, reading `Game.log` for the import; version 0.11.0, live reading of `Game.log` during an OVERLAY session.

## How to check the installer

Installers on the Releases page are built by **GitHub Actions** from this code, not on anyone's PC.

1. **SHA-256:** `Get-FileHash` on the downloaded file must match `SHA256SUMS.txt`.
2. **Build provenance:** `gh attestation verify "<installer>.exe" --repo raphaelgollner/r4zz0r_sc_companion`.
3. **Antivirus:** each release links its VirusTotal report. Without code signing, SmartScreen shows a blue warning and a few engines may raise generic alerts.
4. **Build it yourself:** `npm ci` then `npx tauri build` (Node.js and Rust required).
