# Dashboard Permissions System — Implementation Summary

## Files Changed

### 1. `src/utils/exportTemplate.js`
- Bumped version to `5.4.0`, added `schemaVersion: '2.0'`
- New signature: `buildTemplateJSON(elements, canvasConfig, componentSettings)`
- Added `component_permissions` block to exported JSON root
- Added `element_type` field on every exported object
- Guaranteed `delete`, `font_family`, `font_size`, `font_color` present on all objects
  (font fields default to `'locked'` for non-text types)

### 2. `src/data/mockData.js`
- Updated all 4 templates to version `5.4.0`
- Added `component_permissions` block to each template
- Added `element_type` to every object in every template
- Added `delete: 'no'` to all permissions objects
- Template configurations:
  - Template 1 (Happy Birthday): all 4 types enabled, allow_add all false
  - Template 2 (Engagement): shape disabled, rest enabled
  - Template 3 (Baby Shower): all enabled, allow_add all false
  - Template 4 (Sweet 16): image + shape disabled, text + background enabled

### 3. `src/components/modals/ExportPreviewModal.jsx` *(new file)*
- Preview modal shown before export
- Left: canvas colour thumbnail with dimensions
- Right: template name, element count, editable field count
- `PermTable` component: Component | Enabled | Allow Add table
- Collapsible JSON viewer with copy-to-clipboard button
- Cancel / Confirm Export & Save buttons

### 4. `src/components/builder/LayersPanel.jsx`
- Added `componentSettings` prop
- `LayerRow` accepts `componentSettings` and checks `componentSettings[el.type]?.enabled === false`
- Shows orange "Will be disabled" badge with `AlertTriangle` icon on affected layers
- Layer icon and name text turn orange when type is disabled

### 5. `src/components/builder/TemplateBuilderMode.jsx`
- Added `componentSettings` and `onComponentSettingsChange` props
- Added `ToggleSwitch` component (inline CSS, no deps)
- Added `COMP_ROWS` config for the 4 component types
- Added **Component Settings** panel (3-column grid: Component | Enabled | Allow Add New)
  - Background row has N/A for Allow Add New
  - Allow Add toggle is greyed-out when type is Enabled: Off
- Extended `syncPermissionsToCanvas()` with:
  - `obj.__fontLocked = p.font_family === 'locked'`
  - `obj.__fontSizeLocked = p.font_size === 'locked'`
  - `obj.__colorLocked = p.font_color === 'locked'`
  - `obj.__preventDelete = p.delete === 'no'`
- Passes `componentSettings` down to `LayersPanel`

### 6. `src/pages/BuilderPage.jsx`
- Added `componentSettings` state (default: text+image enabled, shape off)
- Added `previewVisible` and `previewJSON` state
- Updated `runExportTemplate` to pass `componentSettings` to `buildTemplateJSON`
- Updated `handleExportTemplate` to build preview JSON and show `ExportPreviewModal` first
- Added `handlePreviewConfirm` which closes preview and calls `runExportTemplate`
- Imported and rendered `ExportPreviewModal`
- Passes `componentSettings` and `onComponentSettingsChange` to `TemplateBuilderMode`

---

## Exported JSON Example

```json
{
  "version": "5.4.0",
  "schemaVersion": "2.0",
  "component_permissions": {
    "text":       { "enabled": true,  "allow_add": false },
    "image":      { "enabled": false, "allow_add": false },
    "shape":      { "enabled": false, "allow_add": false },
    "background": { "enabled": true }
  },
  "canvasWidth": 600,
  "canvasHeight": 600,
  "background": "#ffe4e1",
  "objects": [
    {
      "type": "rect",
      "element_type": "background",
      "id": "bg-rect",
      "label": null,
      "required": false,
      "editable": false,
      "permissions": {
        "content": "fixed",
        "position": "locked",
        "size": "locked",
        "rotation": "locked",
        "delete": "no",
        "font_family": "locked",
        "font_size": "locked",
        "font_color": "locked"
      },
      "left": 0,
      "top": 0,
      "fill": "#ffe4e1",
      "width": 600,
      "height": 600
    },
    {
      "type": "i-text",
      "element_type": "text",
      "id": "sweet16-text",
      "label": "Celebration Text",
      "required": true,
      "editable": true,
      "permissions": {
        "content": "replaceable",
        "position": "locked",
        "size": "locked",
        "rotation": "locked",
        "delete": "no",
        "font_family": "locked",
        "font_size": "locked",
        "font_color": "dynamic"
      },
      "text": "Sweet 16",
      "left": 300,
      "top": 180,
      "fontSize": 52,
      "fontFamily": "Playfair Display",
      "fill": "#1C1A17",
      "fontWeight": "normal",
      "fontStyle": "normal"
    }
  ]
}
```

---

## Bugs Found and Fixed

1. **`buildTemplateJSON` missing `componentSettings` parameter** — old call
   `buildTemplateJSON(elements, canvasConfig)` in `runExportTemplate` did not pass
   component settings. Fixed in `BuilderPage.jsx`.

2. **`handleAddElement` missing `delete` in default permissions** — the default
   permissions object on new elements did not include `delete: 'no'`. This meant
   newly added elements would have `delete: undefined` which exports as absent.
   The fix is in `exportTemplate.js` which now defaults `p.delete || 'no'`
   so the export is always complete regardless.

3. **Font permission flags never written to Fabric objects** — `syncPermissionsToCanvas`
   only applied movement/scale/rotation locks. Font and delete flags were stored in
   React state but never pushed onto Fabric objects. Fixed by adding
   `__fontLocked`, `__fontSizeLocked`, `__colorLocked`, `__preventDelete`.

---

## Remaining Issues / Notes

- **Font flags (`__fontLocked` etc.) are visual indicators only** — the admin canvas
  does not block font/color editing. This is intentional: admin needs full design access.
  The customer editor must read these from exported JSON and enforce them there.

- **canvas.toJSON custom properties** — if you call `canvas.toJSON()` directly (e.g.
  to save canvas state), include the custom property list:
  ```js
  canvas.toJSON(['id','label','required','editable','element_type','permissions',
    '__fontLocked','__fontSizeLocked','__colorLocked','__preventDelete'])
  ```

- **Preview image upload** — the `image` step in ExportProgressModal is currently
  skipped in dev mode. Production image upload via Shopify Staged Uploads is a
  separate task.

- **PermissionsPanel.jsx** — verified fully working. All 9 fields render correctly,
  onChange properly updates element state which immediately triggers
  `syncPermissionsToCanvas`. No changes were needed.
