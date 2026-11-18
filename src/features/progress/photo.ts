const MAX_BYTES = 10 * 1024 * 1024
const MAX_SIDE = 256

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new Error('invalid_image'))
    r.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('invalid_image'))
    img.src = src
  })
}

/** Reduz a foto do perfil para no máximo 256×256 e devolve um data URL JPEG. */
export async function resizePhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/') || file.size > MAX_BYTES) throw new Error('invalid_image')
  const img = await loadImage(await readAsDataUrl(file))
  const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('invalid_image')
  ctx.drawImage(img, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', 0.85)
}
