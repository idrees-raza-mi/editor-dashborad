import { util, Path } from 'fabric';

// ── getPathBoundingBox ────────────────────────────────────────────
export function getPathBoundingBox(pathString) {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden;';
  const path = document.createElementNS(svgNS, 'path');
  path.setAttribute('d', pathString);
  svg.appendChild(path);
  document.body.appendChild(svg);
  const bbox = path.getBBox();
  document.body.removeChild(svg);
  return { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height };
}

// ── scaleSvgPathToCanvas ──────────────────────────────────────────
// NOTE: Prompt used fabric.util (v5 global) — fixed to named import util (v7)
export function scaleSvgPathToCanvas(pathString, targetWidth, targetHeight, padding = 20) {
  if (!pathString || !pathString.trim()) return null;

  const bbox = getPathBoundingBox(pathString);
  if (!bbox || bbox.width === 0 || bbox.height === 0) return null;

  const availW = targetWidth - padding * 2;
  const availH = targetHeight - padding * 2;
  const scaleX = availW / bbox.width;
  const scaleY = availH / bbox.height;
  const scale = Math.min(scaleX, scaleY);

  const scaledW = bbox.width * scale;
  const scaledH = bbox.height * scale;
  const offsetX = (targetWidth - scaledW) / 2 - bbox.x * scale;
  const offsetY = (targetHeight - scaledH) / 2 - bbox.y * scale;

  const parsedPath = util.parsePath(pathString);
  const transformedPath = util.transformPath(parsedPath, [scale, 0, 0, scale, offsetX, offsetY]);
  return util.joinPath(transformedPath);
}

// ── isValidSvgPath ────────────────────────────────────────────────
export function isValidSvgPath(pathString) {
  if (!pathString || typeof pathString !== 'string') return false;
  const trimmed = pathString.trim();
  if (!trimmed.startsWith('M') && !trimmed.startsWith('m')) return false;
  try {
    const bbox = getPathBoundingBox(pathString);
    return bbox.width > 0 && bbox.height > 0;
  } catch {
    return false;
  }
}

// ── parseSvgFileToPath ────────────────────────────────────────────
export function parseSvgFileToPath(svgString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const pathEl = doc.querySelector('path');
  if (!pathEl) return null;
  return pathEl.getAttribute('d') || null;
}
