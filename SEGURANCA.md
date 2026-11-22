# Segurança / Security

*English below.*

## O que o app faz e o que não faz

O Tayko Corp Companion é um app de desktop (Tauri) que mostra dados públicos do Star Citizen. Tudo abaixo pode ser conferido no código deste repositório.

| | |
|---|---|
| **Conexões de rede** | Só `api.uexcorp.uk` (preços, terminais, naves), `api.star-citizen.wiki` (dados de naves e itens) e `assets.uexcorp.space` (imagens). A regra de segurança do app (CSP, em [`src-tauri/tauri.conf.json`](src-tauri/tauri.conf.json)) bloqueia qualquer outro endereço. |
| **Permissões do sistema** | Só as básicas do Tauri e a de abrir links no navegador (TAYKO.ORG e o site do desenvolvedor). Veja [`src-tauri/capabilities/default.json`](src-tauri/capabilities/default.json). |
| **Arquivos do PC** | Não lê nem grava arquivos fora do próprio app. |
| **Comandos** | Não roda programas nem comandos. |
| **Conta, login, senha** | Não existem. Nenhuma senha, token ou chave de API é pedida ou guardada. |
| **Seus dados** | Preferências, frota e registros ficam só no seu PC, dentro do app. Nada é enviado. |
| **Telemetria** | Nenhuma. |

Se alguma dessas regras mudar (por exemplo, ler o `Game.log` do jogo), a mudança será anunciada nas notas da versão e nesta página.

## Como conferir o instalador

Os instaladores da página [Releases](../../releases) são gerados pelo **GitHub Actions** a partir deste código ([`.github/workflows/release.yml`](.github/workflows/release.yml)), não no PC de ninguém.

1. **Hash SHA-256**: confira se o arquivo baixado é o publicado. No PowerShell:

   ```powershell
   Get-FileHash ".\Tayko.Corp.Companion_0.9.0_x64-setup.exe"
   ```

   O resultado deve ser igual ao do `SHA256SUMS.txt` e ao das notas da versão.

2. **Atestado de origem**: prova que o instalador saiu deste repositório, deste código, pelo GitHub Actions. Com o [GitHub CLI](https://cli.github.com/):

   ```powershell
   gh attestation verify ".\Tayko.Corp.Companion_0.9.0_x64-setup.exe" --repo raphaelgollner/r4zz0r_sc_companion
   ```

3. **Antivírus**: cada versão é enviada ao [VirusTotal](https://www.virustotal.com/); o link do relatório fica nas notas da versão. Como o app ainda não tem assinatura de código, um ou outro antivírus pode dar um alerta genérico, e o Windows mostra o aviso azul do SmartScreen ("Mais informações" → "Executar assim mesmo").

4. **Compilar você mesmo**: com Node.js e Rust instalados, `npm ci` e `npx tauri build`.

---

## What the app does and does not do

Tayko Corp Companion is a desktop app (Tauri) that shows public Star Citizen data. Everything below can be checked in this repository's code.

- **Network:** only `api.uexcorp.uk`, `api.star-citizen.wiki` and `assets.uexcorp.space` (images). The app's Content Security Policy in `src-tauri/tauri.conf.json` blocks every other address.
- **System permissions:** only Tauri's defaults and opening links in your browser (`src-tauri/capabilities/default.json`).
- **Files:** does not read or write files outside the app. **Commands:** runs none.
- **Account, login, password:** none. No password, token or API key is asked for or stored.
- **Your data:** stays on your PC, inside the app. **Telemetry:** none.

Any change to these rules (for example, reading the game's `Game.log`) will be announced in the release notes and on this page.

## How to check the installer

Installers on the Releases page are built by **GitHub Actions** from this code, not on anyone's PC.

1. **SHA-256:** `Get-FileHash` on the downloaded file must match `SHA256SUMS.txt`.
2. **Build provenance:** `gh attestation verify "<installer>.exe" --repo raphaelgollner/r4zz0r_sc_companion`.
3. **Antivirus:** each release links its VirusTotal report. Without code signing, SmartScreen shows a blue warning and a few engines may raise generic alerts.
4. **Build it yourself:** `npm ci` then `npx tauri build` (Node.js and Rust required).
