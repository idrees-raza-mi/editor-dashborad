// Background removal via local API server at http://127.0.0.1:8080/remove-bg
// NOTE: Prompt used fabricImage.setSrc(url, callback, opts) — v5 API.
// Fixed for Fabric.js v7: setSrc(url, opts) returns a Promise.

export async function removeBackground(canvas, fabricImage, onStart, onDone, onError) {
  try {
    onStart();
    const src = fabricImage.getSrc();

    let blob;
    if (src.startsWith('data:') || src.startsWith('blob:')) {
      const response = await fetch(src);
      blob = await response.blob();
    } else {
      const response = await fetch(src);
      blob = await response.blob();
    }

    const formData = new FormData();
    formData.append('file', blob, 'image.png');

    const apiResponse = await fetch('http://127.0.0.1:8080/remove-bg', {
      method: 'POST',
      body: formData,
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      throw new Error(`API error ${apiResponse.status}: ${errorText}`);
    }

    const resultBlob = await apiResponse.blob();
    const newUrl = URL.createObjectURL(resultBlob);

    // v7: setSrc is async, no callback
    await fabricImage.setSrc(newUrl, { crossOrigin: 'anonymous' });
    canvas.renderAll();
    onDone();
  } catch (err) {
    console.error('Background removal error:', err);
    onError(err.message || 'Failed to remove background');
  }
}
