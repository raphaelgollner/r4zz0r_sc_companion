/** Abre um endereço no navegador do sistema (no app Tauri) ou numa aba nova (navegador/testes). */
export async function openExternal(url: string): Promise<void> {
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    const { openUrl } = await import('@tauri-apps/plugin-opener')
    await openUrl(url)
    return
  }
  window.open(url, '_blank', 'noopener')
}
