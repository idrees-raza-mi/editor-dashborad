import { uploadImageToShopify } from './shopifyAdmin'

const MAX_IMAGE_DIMENSION = 1200

async function compressImage(blob) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let width = img.width
      let height = img.height
      const originalWidth = width
      const originalHeight = height

      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        if (width > height) {
          height = (height / width) * MAX_IMAGE_DIMENSION
          width = MAX_IMAGE_DIMENSION
        } else {
          width = (width / height) * MAX_IMAGE_DIMENSION
          height = MAX_IMAGE_DIMENSION
        }
      }

      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob((compressed) => {
        if (compressed) {
          resolve({
            blob: compressed,
            originalWidth,
            originalHeight,
            newWidth: width,
            newHeight: height
          })
        } else {
          reject(new Error('Failed to compress image'))
        }
      }, 'image/jpeg', 0.85)
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(blob)
  })
}

export async function sanitizeTemplateJSON(templateJSON, onProgress) {
  if (!templateJSON || !templateJSON.objects) {
    return templateJSON
  }

  // Find all objects that have a blob:// src
  const objectsWithBlobSrc = templateJSON.objects.filter(obj =>
    obj.src && typeof obj.src === 'string' &&
    obj.src.startsWith('blob:')
  )

  if (objectsWithBlobSrc.length === 0) {
    // No blob URLs found — JSON is already clean
    return templateJSON
  }

  if (onProgress) {
    onProgress(`Uploading ${objectsWithBlobSrc.length} image(s) to Shopify...`)
  }

  // Upload each blob image and build a replacement map { blobUrl: cdnUrl }
  const urlMap = {}

  for (let i = 0; i < objectsWithBlobSrc.length; i++) {
    const obj = objectsWithBlobSrc[i]
    const blobUrl = obj.src
    const originalScaleX = obj.scaleX || 1
    const originalScaleY = obj.scaleY || 1

    if (onProgress) {
      onProgress(`Uploading image ${i + 1} of ${objectsWithBlobSrc.length}...`)
    }

    try {
      // Fetch the blob URL to get the actual file data
      const response = await fetch(blobUrl)
      if (!response.ok) {
        throw new Error('Could not read blob URL — it may have expired')
      }

      const blob = await response.blob()

      if (onProgress) {
        onProgress(`Compressing image ${i + 1}...`)
      }

      // Compress image before upload to speed up Shopify processing
      const { blob: compressedBlob, originalWidth, originalHeight, newWidth, newHeight } = await compressImage(blob)
      console.log('[sanitize] Original size:', blob.size, 'Compressed:', compressedBlob.size, 'dims:', originalWidth, 'x', originalHeight, '->', newWidth, 'x', newHeight)

      // Calculate new scale to maintain the same display size
      // Example: original 4000px @ scale 0.15 displays at 600px
      // Compress to 1200px - need scale 0.5 to still display at 600px
      const displaySizeX = originalWidth * originalScaleX
      const displaySizeY = originalHeight * originalScaleY
      const newScaleX = originalWidth > 0 ? displaySizeX / newWidth : 1
      const newScaleY = originalHeight > 0 ? displaySizeY / newHeight : 1
      console.log('[sanitize] Display size:', displaySizeX, '-> newScale:', newScaleX)

      const filename = `template-image-${Date.now()}-${i}.jpg`

      // Upload to Shopify Files — returns { cdnUrl, fileId }
      const result = await uploadImageToShopify(compressedBlob, filename)
      const cdnUrl = result.cdnUrl

      urlMap[blobUrl] = { cdnUrl, newScaleX, newScaleY }

      console.info(`[sanitize] Replaced blob with CDN URL: ${cdnUrl}, scale: ${newScaleX}`)

    } catch (err) {
      console.error(`[sanitize] Failed to upload image ${i + 1}:`, err)
      // Do not throw — skip this image and continue
      urlMap[blobUrl] = null
    }
  }

  // Replace all blob URLs in the JSON with CDN URLs
  const cleanObjects = templateJSON.objects.map(obj => {
    if (
      obj.src &&
      typeof obj.src === 'string' &&
      obj.src.startsWith('blob:')
    ) {
      const replacement = urlMap[obj.src]
      if (replacement && replacement.cdnUrl) {
        return { 
          ...obj, 
          src: replacement.cdnUrl,
          scaleX: replacement.newScaleX,
          scaleY: replacement.newScaleY
        }
      }
      // Upload failed — set empty src so editor shows placeholder
      const { src, ...rest } = obj
      return { ...rest, src: '' }
    }
    return obj
  })

  // Also check backgroundImage if present
  let cleanBackground = templateJSON.background
  if (
    typeof cleanBackground === 'string' &&
    cleanBackground.startsWith('blob:')
  ) {
    const replacement = urlMap[cleanBackground]
    cleanBackground = replacement?.cdnUrl || ''
  }

  return {
    ...templateJSON,
    background: cleanBackground,
    objects: cleanObjects
  }
}

export function hasUnsavedBlobUrls(templateJSON) {
  if (!templateJSON || !templateJSON.objects) return false
  return templateJSON.objects.some(
    obj => obj.src && typeof obj.src === 'string' && obj.src.startsWith('blob:')
  )
}
