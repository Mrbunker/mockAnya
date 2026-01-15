export type ImageOptions = {
  format: 'png' | 'jpeg'
  width: number
  height: number
  bgMode: 'black' | 'solid' | 'checker'
  color: string
  onProgress?: (value: number) => void
}

export async function generateImage(opts: ImageOptions) {
  const { format, width, height, bgMode, color, onProgress } = opts
  onProgress?.(10)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  if (bgMode === 'black') {
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, width, height)
  } else if (bgMode === 'solid') {
    ctx.fillStyle = color
    ctx.fillRect(0, 0, width, height)
  } else {
    const size = 32
    for (let y = 0; y < height; y += size) {
      for (let x = 0; x < width; x += size) {
        const isDark = ((x / size) + (y / size)) % 2 === 0
        ctx.fillStyle = isDark ? '#111827' : '#374151'
        ctx.fillRect(x, y, size, size)
      }
    }
  }
  onProgress?.(60)
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), format === 'png' ? 'image/png' : 'image/jpeg')
  })
  const filename = `image_${width}x${height}.${format}`
  onProgress?.(80)
  return { blob, filename }
}

export type TextOptions = {
  format: 'txt' | 'json'
  repeatText: string
  targetMB: number
  onProgress?: (value: number) => void
}

export async function generateText(opts: TextOptions) {
  const { format, repeatText, targetMB, onProgress } = opts
  const totalBytes = targetMB * 1024 * 1024
  const chunk = (repeatText + '\n').repeat(1000)
  const encoder = new TextEncoder()
  let size = 0
  const parts: string[] = []
  while (size < totalBytes) {
    const encoded = encoder.encode(chunk)
    parts.push(chunk)
    size += encoded.byteLength
    onProgress?.(Math.min(99, Math.floor((size / totalBytes) * 100)))
    if (parts.length % 100 === 0) await new Promise(r => setTimeout(r))
  }
  let blob: Blob
  if (format === 'txt') {
    blob = new Blob(parts, { type: 'text/plain' })
  } else {
    const obj = { content: repeatText, repeatsApprox: Math.round(size / encoder.encode(repeatText).byteLength) }
    blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' })
  }
  const filename = `text_${targetMB}MB.${format}`
  return { blob, filename }
}
