# Admin Dashboard — Analysis Report
**Generated:** 2026-04-04  
**Codebase:** `parties-signs-admin` (React + Vite, no TypeScript)

---

## Summary

| Metric | Value |
|--------|-------|
| Overall project health | **6 / 10** |
| Bugs found | **9** |
| Missing features | **8** |
| Most critical issue | **TemplatesPage "Upload to Shopify" is entirely fake — no real API call is made** |

---

## 1. Template Cards Visual Preview

### What Was Implemented

**`TemplateCard.jsx`** — `TemplateThumbnail` component renders the actual stored design using the HTML5 Canvas 2D API (NOT Fabric.js). Chosen deliberately to keep card thumbnails lightweight with no canvas lifecycle overhead.

Rendering pipeline:
1. Draws `templateJSON.background` (or `backgroundColor` prop) as fill
2. Iterates `templateJSON.objects`:
   - `rect` — fills with `obj.fill`, handles rounded corners via `ctx.roundRect()` (falls back to `fillRect`), draws stroke if `obj.stroke` + `obj.strokeWidth`
   - `i-text` / `element_type === 'text'` — sets font with `style weight size "family"`, respects `originX` for alignment, fills with `obj.fill`
   - `image` — creates an `Image`, sets `crossOrigin = 'anonymous'`, draws at position with `scaleX`/`scaleY`, respects `opacity`
3. Waits for `document.fonts.ready` before drawing so Google Fonts are loaded

Scale: `Math.min(THUMB_W / cw, THUMB_H / ch)` — preserves aspect ratio within 280×160 px card thumbnail.

Fallback: if no `templateJSON`, shows `template.name` as centered text.

**`CanvasCard.jsx`** — `CanvasThumbnail` renders an SVG (not Canvas 2D) showing the configured shape:
- `viewBox` set from `canvasWidth × canvasHeight`
- Shadow path: `fill="rgba(0,0,0,0.08)" transform="translate(3,4)"`
- Main path: `fill={variant.backgroundColor}`, `strokeWidth={vw * 0.012}`
- If no `svgPath` set, shows a plain rectangle with the background colour + `vw × vh` dimensions label
- Variant switcher pills (2FT / 3FT / 4FT) overlaid at top-left when `canvas.variants.length > 1`

### Known Limitation

`TemplateThumbnail` draws text at absolute `(obj.left, obj.top)` coordinates from the JSON — this matches how `buildTemplateJSON` stores positions. However, Fabric's `textBaseline = 'top'` is set, which is correct. Text transforms (rotation, skew) stored in the JSON are NOT applied to the thumbnail canvas context — text always renders upright.

---

## 2. Template Builder Canvas Loading

### Entry Point

`BuilderPage.jsx` — the single page for both template builder and canvas configurator modes.

### Template Builder Flow (mode = 'template')

`BuilderPage` passes `elements` + `canvasConfig` + `componentSettings` + `onElementsChange` to `TemplateBuilderMode`.

`TemplateBuilderMode.jsx` owns the Fabric canvas lifecycle:
- `useEffect` with `[canvasConfig]` dependency — creates `new Canvas(canvasRef.current, { width, height })`, sets background color, then re-creates elements from `elements` prop if any exist
- `syncPermissionsToCanvas(elements)` — called after every element or permission change; applies lock flags to Fabric objects

**Element state flow:**
```
User action (add/move/resize/delete)
  → Fabric canvas event (object:modified / object:added / object:removed)
  → setElements(newArr)           [React state in TemplateBuilderMode]
  → onElementsChange(newArr)      [prop — lifts to BuilderPage]
  → BuilderPage stores in elements state
```

**Undo / Redo:**
- `historyRef.current` = array of serialised `elements` arrays (plain JSON, NOT `canvas.toJSON()`)
- `handleUndo` / `handleRedo` pop from history and call `setElements` + trigger re-render
- Lock flags (`lockMovementX`, etc.) are NOT re-applied after undo — the Fabric canvas shows unlocked handles even if the permission is "locked" until the user causes another re-render

### Canvas Configurator Flow (mode = 'canvas')

`CanvasConfigMode.jsx` manages variant state (`variants` array) + canvas name/category.

`ConfiguratorCanvas.jsx` renders the Fabric canvas for a single variant:
- Accepts `variant` prop (`{ canvasWidth, canvasHeight, svgPath, backgroundColor }`)
- Creates a `new Canvas(...)` on mount, sets `backgroundColor`, adds grid lines, adds a centred placeholder `IText`
- If `variant.svgPath` is set: calls `scaleSvgPathToCanvas(svgPath, cw, ch, 16)` then `fc.clipPath = new Path(scaledPathStr, { absolutePositioned: true, selectable: false, evented: false })`
- Key uses Fabric v7 named imports correctly (was originally v5-style globals, fixed)

The `key` prop on `ConfiguratorCanvas` is `${variant.id}-${variant.canvasWidth}-${variant.canvasHeight}-${refreshKey}` — so any dimension change unmounts + remounts the canvas component (brute-force but correct).

---

## 3. Per-Element Permission Isolation

### Storage Shape

Permissions live on each element in the `elements` React array:

```js
element.permissions = {
  position:    'free' | 'locked',
  size:        'free' | 'locked',
  rotation:    'free' | 'locked',
  content:     'editable' | 'view_only',
  font_family: 'free' | 'locked',
  font_size:   'free' | 'locked',
  font_color:  'free' | 'locked',
  delete:      'yes' | 'no',
}
```

Component-level permissions live separately in `BuilderPage.componentSettings`:

```js
componentSettings = {
  text:       { enabled: bool, allow_add: bool },
  image:      { enabled: bool, allow_add: bool },
  shape:      { enabled: bool, allow_add: bool },
  background: { enabled: bool },
}
```

### Canvas Sync

`syncPermissionsToCanvas(updatedElements)` — `TemplateBuilderMode.jsx` lines ~240–270:

```js
obj.lockMovementX = p.position === 'locked';
obj.lockMovementY = p.position === 'locked';
obj.lockScalingX  = p.size === 'locked';
obj.lockScalingY  = p.size === 'locked';
obj.lockRotation  = p.rotation === 'locked';
obj.setControlsVisibility({ mt: !locked, mb: !locked, ml: !locked, mr: !locked });
obj.__fontLocked     = p.font_family === 'locked';   // stored on Fabric obj
obj.__fontSizeLocked = p.font_size   === 'locked';
obj.__colorLocked    = p.font_color  === 'locked';
obj.__preventDelete  = p.delete === 'no';
```

Isolation is per-object — the function uses `const el = updatedElements.find(e => e.id === obj.id)` to match by ID, so changing one element's permissions only affects that Fabric object.

**Note:** `__fontLocked`, `__fontSizeLocked`, `__colorLocked`, `__preventDelete` are set on the Fabric object but are never read by any code in this admin dashboard. They exist as forward-looking stubs — the customer editor would read these from the exported JSON's `permissions` block. `buildTemplateJSON` reads from the React `elements` state (not `canvas.toJSON()`), so these flags are cosmetically harmless but redundant in the admin context.

### Export

`buildTemplateJSON(elements, canvasConfig, componentSettings)` — `src/utils/exportTemplate.js`:
- Schema version `5.4.0` / schemaVersion `2.0`
- Writes `component_permissions` at the top level from `componentSettings`
- Writes `element_type` on every object
- Writes full `permissions` block per object with defaults (`p.delete || 'no'`)

---

## 4. Complete Data Flow

### 4A. Template Builder — Create & Upload

```
User opens /builder?mode=template
  └─ BuilderPage renders CanvasSetup (step = 'setup')
       User sets name, category, canvas size (px or cm toggle)
       User clicks "Build Template"
  └─ BuilderPage renders TemplateBuilderMode (step = 'build')
       User adds elements (text / image / shape) via sidebar
       User sets per-element permissions in ElementPermissionsPanel
       User sets component-level permissions in ComponentSettings panel
       User clicks Export button
  └─ BuilderPage.handleExportTemplate()
       1. Validates (name required, at least 1 element)
       2. Calls buildTemplateJSON(elements, canvasConfig, componentSettings)
          → returns templateJSON object (v5.4.0)
       3. Opens ExportPreviewModal (shows permissions table + collapsible JSON)
  └─ User clicks "Confirm Export & Save"
  └─ BuilderPage.runExportTemplate(templateJSON)
       4. Skips preview image capture (previewImageUrl = '' — NOT IMPLEMENTED)
       5. If prod: callAdminProxy('createMetaobject', { type: 'design_template', fields })
             → api/shopify.js → metaobjectCreate GraphQL mutation
             → returns { id, handle }
             addTemplate({ ..., status: 'uploaded', metaobjectId: id })
          If dev: sleep(500), addTemplate({ ..., status: 'not_uploaded', metaobjectId: null })
```

**Data shape at rest (AppContext `templates` array):**

```js
{
  id: 'tmpl-...',
  name: 'string',
  category: 'string',
  status: 'not_uploaded' | 'uploaded',
  metaobjectId: 'gid://shopify/Metaobject/...' | null,
  canvasWidth: number,
  canvasHeight: number,
  backgroundColor: '#xxxxxx',
  elements: number,        // count only
  editableFields: number,  // count only
  variants: [{ id, label, price }],
  templateJSON: { ...full v5.4.0 object }
}
```

---

### 4B. Canvas Configurator — Create & Upload

```
User opens /builder?mode=canvas
  └─ BuilderPage renders CanvasConfigMode
       User fills: Canvas Name, Category
       User adds variants (up to 3)
       Per variant: Label (2FT/3FT), Price, Width, Height (px or cm), Background Color
       User clicks "Set Shape" → ShapeCreator modal
         → User picks preset or uploads SVG
         → svgPath stored on activeVariant
       Live preview via ConfiguratorCanvas (remounts on every dimension change)
       User clicks "Test in Customer Editor"
         → sessionStorage.__editor_test_config__ = JSON.stringify(config)
         → window.open(VITE_CUSTOMER_EDITOR_URL + '?mode=admin-preview')
  └─ User clicks Save Canvas (in BuilderPage header)
  └─ BuilderPage.handleSaveCanvas()
       If prod: callAdminProxy('createMetaobject', { type: 'canvas_config', fields })
       If dev:  sleep(500), addCanvas({ ..., status: 'not_uploaded' })
```

**Data shape at rest (AppContext `canvases` array):**

```js
{
  id: 'canv-...',
  name: 'string',
  category: 'string',
  status: 'not_uploaded' | 'uploaded',
  metaobjectId: 'gid://shopify/Metaobject/...' | null,
  variants: [
    {
      id: 'cv-...',
      label: '2FT',
      price: '89.99',
      canvasWidth: number,
      canvasHeight: number,
      svgPath: 'M ...' | null,
      backgroundColor: '#xxxxxx',
    }
  ]
}
```

---

### 4C. TemplatesPage Re-upload

```
TemplatesPage.jsx renders TemplateCard / CanvasCard for each item
  User clicks "Upload to Shopify" or "Re-upload"
  └─ TemplatesPage.handleConfirmUpload()
       await sleep(1200)
       const newId = 'gid://shopify/Metaobject/' + Date.now()  ← FAKE
       updateTemplate/updateCanvas(id, { status: 'uploaded', metaobjectId: newId })
       ← NO real API call is made
```

---

### 4D. Shopify API Proxy (`api/shopify.js`)

Four actions via Vercel serverless function:

| Action | GraphQL mutation | Used by |
|--------|-----------------|---------|
| `stagedUpload` | `stagedUploadsCreate` | `shopifyAdmin.js` (uploadImageToShopify — never called) |
| `createFile` | `fileCreate` | `shopifyAdmin.js` (uploadImageToShopify — never called) |
| `createMetaobject` | `metaobjectCreate` | `runExportTemplate`, `handleSaveCanvas` |
| `updateMetaobject` | `metaobjectUpdate` | Not called from anywhere |

Endpoint: `https://${SHOPIFY_STORE}/admin/api/2024-01/graphql.json`

---

## 5. Bug List

| # | Severity | File | Location | Description |
|---|----------|------|----------|-------------|
| B1 | **Critical** | `src/pages/TemplatesPage.jsx` | `handleConfirmUpload` (line ~44) | "Upload to Shopify" / "Re-upload" buttons perform no real API call. A fake GID is generated with `Date.now()`, status is set to `uploaded` locally, nothing is sent to Shopify. |
| B2 | **High** | `src/pages/TemplatesPage.jsx` | `onEdit` handler (line ~30) | Navigates to `/builder?mode=template&id=${item.id}` but `BuilderPage` never reads the `?id` query param. The builder opens blank with no template loaded — edit is broken. |
| B3 | **High** | `src/utils/shopifyAdmin.js` | `uploadImageToShopify` (entire function) | Fully implemented 3-step image upload (stagedUpload → S3 POST → createFile) but is never called anywhere in the codebase. Template exports always have `previewImageUrl = ''`. |
| B4 | **High** | `src/components/builder/TemplateBuilderMode.jsx` | After undo/redo | `handleUndo` / `handleRedo` restore the `elements` array but do NOT call `syncPermissionsToCanvas`. Fabric objects on canvas have stale lock flags — elements that should be locked show unlock handles until next interaction. |
| B5 | **Medium** | `src/components/builder/BuilderCanvas.jsx` | Toolbar (line ~246–249) | ZoomIn and ZoomOut buttons have no `onClick` handler. Zoom is non-functional. |
| B6 | **Medium** | `src/components/builder/BuilderCanvas.jsx` | Toolbar (line ~248–249) | Undo/Redo buttons in the canvas toolbar have no `onClick`. The working undo/redo is in `TemplateBuilderMode` keyboard shortcuts / sidebar buttons — the toolbar buttons are dead. |
| B7 | **Medium** | `src/components/builder/TemplateBuilderMode.jsx` | Background element creation | Background `Rect` elements are created with `fc.width` / `fc.height` at canvas-init time. If the user changes `canvasConfig` (width/height), the background Rect is NOT resized to match — it keeps the old dimensions. |
| B8 | **Low** | `src/context/AppContext.jsx` | Entire context | All state (`templates`, `canvases`) is in-memory only. A page reload resets everything to mock data. There is no persistence layer (localStorage, IndexedDB, or backend DB). |
| B9 | **Low** | `src/components/builder/TemplateBuilderMode.jsx` | `syncPermissionsToCanvas` | `__fontLocked`, `__fontSizeLocked`, `__colorLocked`, `__preventDelete` are set on Fabric objects but never read within this codebase. The export reads from React state, not `canvas.toJSON()`. These properties are forward stubs — documented but misleading in the current admin context. |

---

## 6. Missing Features

| # | Priority | Feature | Notes |
|---|----------|---------|-------|
| F1 | **Critical** | Real re-upload API call in TemplatesPage | `handleConfirmUpload` must call `callAdminProxy('updateMetaobject', ...)` for existing items or `createMetaobject` for new uploads. The proxy action `updateMetaobject` already exists in `api/shopify.js` but is never used. |
| F2 | **Critical** | Load existing template for editing | `BuilderPage` must read `?id` query param, look up the template in `AppContext`, and populate `elements` + `canvasConfig` + `componentSettings` from `template.templateJSON`. |
| F3 | **High** | Preview image capture on export | `runExportTemplate` always sets `previewImageUrl = ''`. Should capture the Fabric canvas via `canvasRef.current.toDataURL()`, convert to Blob, call `uploadImageToShopify(blob, name)` (already fully implemented in `shopifyAdmin.js`), and store the CDN URL in the metaobject. |
| F4 | **High** | Persistent state | All templates and canvases reset on page reload. Need either localStorage save/load on `AppContext` mutations, or a backend fetch from Shopify metaobjects on app load. |
| F5 | **High** | Functional zoom on BuilderCanvas | ZoomIn/ZoomOut buttons have no `onClick`. Need `fc.setZoom(fc.getZoom() * 1.1)` / `* 0.9` with `fc.setViewportTransform` to centre correctly. |
| F6 | **Medium** | Load existing canvas config for editing | Same problem as F2 — `CanvasConfigMode` always starts empty, `?id` is never read for canvas mode. |
| F7 | **Medium** | Delete template / canvas from Shopify | `AppContext` has `deleteTemplate` / `deleteCanvas` but there is no mutation in `api/shopify.js` for `metaobjectDelete`. Deleting locally does not remove the metaobject from Shopify. |
| F8 | **Low** | Fetch templates from Shopify on load | Currently all templates shown in `TemplatesPage` come from `mockData.js` seeded into `AppContext`. There is no `metaobjectList` query to hydrate real data from Shopify. |

---

## 7. Suggested Improvements

### Priority 1 — Fix broken core flows

1. **Fix TemplatesPage re-upload** (`TemplatesPage.jsx` `handleConfirmUpload`):
   ```js
   // Replace the fake timeout + Date.now() GID with:
   const action = uploadItem.metaobjectId ? 'updateMetaobject' : 'createMetaobject';
   const result = await callAdminProxy(action, { id: uploadItem.metaobjectId, fields });
   updateTemplate(uploadItem.id, { status: 'uploaded', metaobjectId: result.id });
   ```

2. **Implement template edit loading** (`BuilderPage.jsx`):
   ```js
   const params = new URLSearchParams(window.location.search);
   const editId = params.get('id');
   if (editId) {
     const existing = templates.find(t => t.id === editId);
     if (existing) {
       setElements(existing.templateJSON.objects.map(deserialiseElement));
       setCanvasConfig({ width: existing.canvasWidth, height: existing.canvasHeight, ... });
       setComponentSettings(existing.templateJSON.component_permissions);
       setStep('build');
     }
   }
   ```

3. **Wire preview image upload** (`BuilderPage.jsx` `runExportTemplate`):
   ```js
   // Replace: let previewImageUrl = '';
   const dataUrl = canvasRef.current?.toDataURL('image/png');
   const blob    = await (await fetch(dataUrl)).blob();
   const previewImageUrl = await uploadImageToShopify(blob, `${canvasConfig.name}-preview.png`);
   ```

### Priority 2 — Fix subtle bugs

4. **Re-apply permissions after undo/redo** (`TemplateBuilderMode.jsx`):
   After `setElements(prev)` in `handleUndo`/`handleRedo`, call `syncPermissionsToCanvas(prev)` in a `useEffect` triggered by `elements` change, or call it directly in the handler.

5. **Resize background rect on canvas resize** (`TemplateBuilderMode.jsx`):
   In the `useEffect` that responds to `canvasConfig` changes, find any element with `element_type === 'background'` in `elements` and update its `width`/`height` before re-creating Fabric objects.

6. **Fix toolbar Undo/Redo/Zoom buttons** (`BuilderCanvas.jsx` lines 246–249):
   These buttons need `onClick` props wired to the handlers already defined in `TemplateBuilderMode`. Pass them as props: `onUndo`, `onRedo`, `onZoomIn`, `onZoomOut`.

### Priority 3 — Architecture & DX

7. **Persist AppContext to localStorage:**
   ```js
   // In AppContext, after every mutation:
   useEffect(() => {
     localStorage.setItem('admin-templates', JSON.stringify(templates));
     localStorage.setItem('admin-canvases',  JSON.stringify(canvases));
   }, [templates, canvases]);
   // On init: JSON.parse(localStorage.getItem('admin-templates')) || MOCK_TEMPLATES
   ```

8. **Hydrate from Shopify on app load:**
   Add a `metaobjectList` query to `api/shopify.js` and call it in `AppContext` on mount to replace mock data with real Shopify records.

9. **Shopify API version:** `api/shopify.js` uses `2024-01`. Recommend bumping to `2025-01` (current stable) before going to production.

10. **Remove misleading Fabric flags:** `__fontLocked`, `__fontSizeLocked`, `__colorLocked`, `__preventDelete` are set on Fabric objects in `syncPermissionsToCanvas` but serve no function in the admin app. Either remove them or add a comment clearly stating they are forward stubs for the customer editor.

---

## File Index

| File | Role | Status |
|------|------|--------|
| `src/pages/BuilderPage.jsx` | Main builder entry, canvas setup, export flow | Working (dev mode); preview image skipped |
| `src/pages/TemplatesPage.jsx` | Browse/re-upload cards | **Broken** — upload is fake |
| `src/components/builder/TemplateBuilderMode.jsx` | Fabric canvas editor, permissions | Working |
| `src/components/builder/CanvasConfigMode.jsx` | Canvas variant configurator | Working |
| `src/components/builder/BuilderCanvas.jsx` | Fabric canvas wrapper + toolbar | Partial — toolbar buttons broken |
| `src/components/builder/ConfiguratorCanvas.jsx` | SVG clip path canvas preview | Working |
| `src/components/builder/ShapeCreator.jsx` | Shape picker modal | Working |
| `src/components/templates/TemplateCard.jsx` | Card with HTML5 Canvas thumbnail | Working |
| `src/components/templates/CanvasCard.jsx` | Card with SVG thumbnail + variant switcher | Working |
| `src/components/modals/ExportPreviewModal.jsx` | Review permissions + JSON before upload | Working |
| `src/components/modals/PreviewModal.jsx` | JSON inspection tool (not a visual preview) | Working as designed |
| `src/utils/exportTemplate.js` | `buildTemplateJSON` — v5.4.0 schema | Working |
| `src/utils/shopifyAdmin.js` | `callAdminProxy` + `uploadImageToShopify` | `uploadImageToShopify` never called |
| `src/context/AppContext.jsx` | In-memory state | No persistence |
| `api/shopify.js` | Vercel serverless Shopify proxy | Working; `updateMetaobject` action unused |
| `src/data/mockData.js` | Seed data (v5.4.0 schema) | Working |
