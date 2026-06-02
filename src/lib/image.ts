const MAX_LONG_EDGE = 1568
const JPEG_QUALITY = 0.85

/**
 * Resize a data URL image to ≤ 1568 px on the long edge and re-encode as JPEG
 * (quality 0.85). Returns the original data URL unchanged if already at or
 * below the threshold. Per research.md Decision 5.
 */
export async function resizeForVision(dataUrl: string): Promise<string> {
  const blob = await fetch(dataUrl).then(r => r.blob())
  const bitmap = await createImageBitmap(blob)

  const { width, height } = bitmap
  const longEdge = Math.max(width, height)

  if (longEdge <= MAX_LONG_EDGE) {
    bitmap.close()
    return dataUrl
  }

  const scale = MAX_LONG_EDGE / longEdge
  const targetWidth = Math.round(width * scale)
  const targetHeight = Math.round(height * scale)

  let outBlob: Blob
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(targetWidth, targetHeight)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not acquire OffscreenCanvas 2D context')
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight)
    outBlob = await canvas.convertToBlob({
      type: 'image/jpeg',
      quality: JPEG_QUALITY,
    })
  } else {
    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not acquire <canvas> 2D context')
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight)
    outBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        b => (b ? resolve(b) : reject(new Error('canvas.toBlob returned null'))),
        'image/jpeg',
        JPEG_QUALITY,
      )
    })
  }

  bitmap.close()
  return blobToDataUrl(outBlob)
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}
