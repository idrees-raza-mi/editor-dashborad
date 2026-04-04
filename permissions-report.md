# Permissions System Report
## Parties & Signs — Template Editor

**Generated:** 2026-04-03  
**Codebases analysed:**
- Admin Dashboard: `Desktop/Admin Dashboard/parties-signs-admin/`
- Customer Editor: `Desktop/design-editor/`

---

## SECTION 1 — Current Permission System Audit

### 1. Permission-related properties on canvas objects

**Every property found on template JSON objects:**

| Property | Type | Values | Location |
|---|---|---|---|
| `editable` | boolean | `true` / `false` | mockData.js:29,47,65,99,109... (every object); exportTemplate.js:41 |
| `label` | string | e.g. `'Title Text'` | mockData.js:48,68... |
| `required` | boolean | `true` / `false` | mockData.js:49,69... |
| `permissions.content` | string | `'fixed'` / `'replaceable'` / `'full_control'` | mockData.js:33,51,68... |
| `permissions.position` | string | `'locked'` / `'dynamic'` | mockData.js:34,52,69... |
| `permissions.size` | string | `'locked'` / `'dynamic'` | mockData.js:34,52,69... |
| `permissions.rotation` | string | `'locked'` / `'dynamic'` | mockData.js:35,53,70... |
| `permissions.font_family` | string | `'locked'` / `'dynamic'` | mockData.js:53,69,113... (text only) |
| `permissions.font_size` | string | `'locked'` / `'dynamic'` | mockData.js:53,69,113... (text only) |
| `permissions.font_color` | string | `'locked'` / `'dynamic'` | mockData.js:53,70,113... (text only) |
| `permissions.delete` | string | `'yes'` / `'no'` | PermissionsPanel.jsx:388–398 |

**Files that READ these properties:**

- `src/components/builder/TemplateBuilderMode.jsx:196–220` — `syncPermissionsToCanvas()` reads `position`, `size`, `rotation`, and `content` to set Fabric.js lock flags and border colours on admin canvas objects
- `src/utils/exportTemplate.js:41` — reads `permissions.content` to derive the `editable` boolean field in exported JSON (`el.permissions.content !== 'fixed'`)

**Files that WRITE or SET these properties:**

- `src/components/builder/TemplateBuilderMode.jsx:107–125` — `handleAddElement()` writes the default permissions object on every new element: all fields defaulting to `'fixed'` / `'locked'`
- `src/components/builder/PermissionsPanel.jsx:72–74` — `updatePerm()` writes individual permission fields: `onChange({ ...element, permissions: { ...element.permissions, [key]: value } })`
- `src/data/mockData.js:32–35, 50–54, 67–71...` — initial permission values in mock template data

---

### 2. What `templateLoader.js` does with permissions

**`templateLoader.js` does NOT EXIST in either codebase.**

There is no file named `templateLoader.js` anywhere under `design-editor/` or `parties-signs-admin/`. This file is entirely **NOT IMPLEMENTED**.

The customer editor (`design-editor/`) has no mechanism to load a template JSON from a Shopify Metaobject, parse its objects array, or apply any permission flags to Fabric.js canvas objects. The editor's `getConfig()` function (`src/config/editorConfig.js:8–17`) accepts `designType: 'template'` as a config value, but `App.jsx` ignores it entirely — `designType` is read nowhere in the app after `getConfig()` is called. The `productTitle` is the only config value used in `App.jsx:11`.

---

### 3. Does the customer editor support permission levels beyond binary locked/unlocked?

**Component-level "enabled" concept:**  
**NO** — Not implemented anywhere in `design-editor/`. No code checks whether a component type (text, image, shape, background) should be enabled or disabled.

**"Replaceable content only" vs "full control" vs "fixed":**  
**NO** — Not implemented. The customer editor has no concept of content permission levels. Every object added to the canvas can be freely edited by the customer. The `editable` custom prop is serialised in undo history (`useUndoRedo.js:4`) but is never read back and never used to restrict editing.

**Position locked vs dynamic:**  
**PARTIAL** — `useUndoRedo.js:4` includes `lockMovementX` and `lockMovementY` in the list of custom props serialised during undo/redo snapshots. However, these are never SET from a template JSON. They are only preserved across undo states if they happen to be present on a Fabric object for other reasons. No code in the customer editor reads a `permissions.position` value and applies `lockMovementX`/`lockMovementY`.

**Font locked vs dynamic:**  
**NO** — Not implemented. `TextControls.jsx` always shows the font picker, font size input, and colour picker regardless of any permission. There is no check against a `permissions.font_family`, `permissions.font_size`, or `permissions.font_color` field.

---

### 4. What does the TemplateEditor component show/hide based on permissions?

**`TemplateEditor` does NOT EXIST as a component.**

The customer editor has no `TemplateEditor` component. The single `App.jsx` renders a fixed 3-panel layout (tools left / canvas centre / properties right) for all modes. No UI controls appear or disappear based on permissions. No toolbar buttons are shown or hidden conditionally. No left panel sections are permission-driven.

The left panel (`editor-panel-left` in `App.jsx:63–67`) always shows:
- `ImageUpload` — always visible
- `AddTextButton` — always visible

The right panel (`PropertiesPanel`) always shows all controls for the selected object type — font picker, filters, opacity, position, delete — with no permission gating whatsoever.

---

### 5. Element types and permission handling

The customer editor currently supports:

| Type | How added | Permission handling |
|---|---|---|
| **Text (IText)** | `AddTextButton.jsx:8` using `fabric.IText` | None. Always fully editable. Font, size, colour, delete all available. |
| **Image** | `ImageUpload.jsx:19` using `fabric.Image.fromURL` | None. Filters, opacity, remove-BG, position always available. |
| **Shape (rect, circle, triangle, path)** | NOT IMPLEMENTED — no shape-add tool exists | N/A |
| **Background** | NOT IMPLEMENTED — no background element concept | N/A |

The **admin dashboard** supports all four types in its builder canvas (`BuilderCanvas.jsx:155–213`): text (`IText`), shape (`Rect`), background (`Rect` sent to back with movement locked), and image (`FabricImage`). The customer editor supports only text and image.

---

## SECTION 2 — Gap Analysis

### 6. What is completely missing from the current permission system?

The following are entirely **NOT IMPLEMENTED** in the customer editor:

1. **templateLoader.js** — No file, no function that fetches or parses a template JSON from a Shopify Metaobject
2. **Template mode rendering** — `designType: 'template'` is accepted by `getConfig()` but App.jsx never branches on it
3. **Permission enforcement on any canvas object** — No code reads `permissions.content`, `.position`, `.size`, `.rotation`, `.font_family`, `.font_size`, `.font_color`, or `.delete` from any loaded template
4. **Component-level enable/disable** — No `component_permissions` block in the JSON schema; no UI hiding based on it
5. **content:fixed enforcement** — Objects with `content: 'fixed'` should not be editable by the customer; currently all objects are freely editable
6. **content:replaceable enforcement** — Customer should only be able to replace text or image, not move/resize/style; not implemented
7. **content:full_control enforcement** — Distinct from replaceable: customer can also style; not differentiated
8. **position:locked enforcement** — `lockMovementX`/`lockMovementY` are never set from template permissions
9. **size:locked enforcement** — `lockScalingX`/`lockScalingY` are never set from template permissions
10. **rotation:locked enforcement** — `lockRotation` is never set from template permissions
11. **font_family:locked enforcement** — Font picker in `TextControls.jsx` is never hidden
12. **font_size:locked enforcement** — Font size input is never hidden or disabled
13. **font_color:locked enforcement** — Colour picker is never hidden or disabled
14. **delete:no enforcement** — Delete button and keyboard Delete key are never gated; all objects can be deleted
15. **Shape add tool** — No shape element type in the customer editor
16. **Background element** — No background colour/element concept in the customer editor
17. **Required field validation** — The `required` property on template objects is never checked before save
18. **Label display** — The customer-facing `label` field on template objects is never shown to the customer
19. **Admin preview mode** — `testInEditor()` in `CanvasConfigMode.jsx:86–98` writes to `sessionStorage` but the customer editor never reads `__editor_test_config__` from sessionStorage

---

### 7. Per-permission implementation status

#### Text component
| Permission | Status | Reference |
|---|---|---|
| component enabled | **NO** | Not implemented anywhere |
| content: fixed | **NO** | Customer editor never reads `permissions.content` |
| content: replaceable | **NO** | Not differentiated from fixed or full_control |
| content: full_control | **NO** | Not differentiated |
| position: locked | **NO** | `lockMovementX`/`Y` never set from template JSON |
| position: dynamic | **PARTIAL** | Canvas objects can be moved (canvasBounds.js constrains to canvas) but permission is not the reason |
| size: locked | **NO** | `lockScalingX`/`Y` never set from template JSON |
| size: dynamic | **PARTIAL** | Objects can be scaled; not permission-driven |
| rotation: locked | **NO** | `lockRotation` never set from template JSON |
| rotation: dynamic | **PARTIAL** | Objects can be rotated; not permission-driven |
| font_family: locked | **NO** | Font picker in TextControls.jsx:111 always shown |
| font_family: dynamic | **PARTIAL** | Font picker always shown; 15 fonts available in FONT_LIST |
| font_size: locked | **NO** | Size input in TextControls.jsx:123 always shown |
| font_size: dynamic | **PARTIAL** | Size input always shown |
| font_color: locked | **NO** | Colour picker in TextControls.jsx:133 always shown |
| font_color: dynamic | **PARTIAL** | Colour picker always shown |

#### Image component
| Permission | Status | Reference |
|---|---|---|
| component enabled | **NO** | ImageUpload always shown |
| content: fixed | **NO** | Not enforced |
| content: replaceable | **NO** | Not enforced |
| content: full_control | **NO** | Not enforced |
| position: locked | **NO** | Not set from template |
| size: locked | **NO** | Not set from template |
| rotation: locked | **NO** | Not set from template |

#### Shape component
| Permission | Status | Reference |
|---|---|---|
| All permissions | **NO** | Shape add tool does not exist in customer editor |

#### Background component
| Permission | Status | Reference |
|---|---|---|
| All permissions | **NO** | Background element concept does not exist in customer editor |

---

## SECTION 3 — JSON Schema Design

### 8. Complete template JSON schema

```json
{
  "version": "5.4.0",
  "background": "#FAF7F2",
  "canvasWidth": 600,
  "canvasHeight": 800,

  "component_permissions": {
    "text": {
      "enabled": true,
      "allow_add": false,
      "max_elements": null
    },
    "image": {
      "enabled": true,
      "allow_add": false,
      "max_elements": null
    },
    "shape": {
      "enabled": false,
      "allow_add": false,
      "max_elements": null
    },
    "background": {
      "enabled": true,
      "allow_add": false,
      "max_elements": 1
    }
  },

  "objects": [

    {
      "id": "bg-001",
      "type": "rect",
      "element_type": "background",
      "left": 0,
      "top": 0,
      "width": 600,
      "height": 800,
      "fill": "#FAF7F2",
      "originX": "left",
      "originY": "top",
      "label": null,
      "required": false,
      "editable": false,
      "permissions": {
        "content": "fixed",
        "position": "locked",
        "size": "locked",
        "rotation": "locked",
        "delete": "no"
      }
    },

    {
      "id": "title-001",
      "type": "i-text",
      "element_type": "text",
      "text": "HAPPY BIRTHDAY",
      "left": 300,
      "top": 160,
      "fontSize": 52,
      "fontFamily": "Playfair Display",
      "fill": "#1C1A17",
      "fontWeight": "bold",
      "fontStyle": "normal",
      "originX": "center",
      "originY": "top",
      "label": "Title Text",
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
      }
    },

    {
      "id": "name-001",
      "type": "i-text",
      "element_type": "text",
      "text": "Your Name Here",
      "left": 300,
      "top": 300,
      "fontSize": 36,
      "fontFamily": "Playfair Display",
      "fill": "#4A3F35",
      "fontWeight": "normal",
      "fontStyle": "normal",
      "originX": "center",
      "originY": "top",
      "label": "Name",
      "required": true,
      "editable": true,
      "permissions": {
        "content": "full_control",
        "position": "dynamic",
        "size": "dynamic",
        "rotation": "locked",
        "delete": "no",
        "font_family": "dynamic",
        "font_size": "dynamic",
        "font_color": "dynamic"
      }
    },

    {
      "id": "photo-001",
      "type": "image",
      "element_type": "image",
      "src": null,
      "left": 150,
      "top": 420,
      "scaleX": 1,
      "scaleY": 1,
      "opacity": 1,
      "originX": "left",
      "originY": "top",
      "label": "Photo",
      "required": false,
      "editable": true,
      "permissions": {
        "content": "replaceable",
        "position": "dynamic",
        "size": "dynamic",
        "rotation": "locked",
        "delete": "yes"
      }
    },

    {
      "id": "shape-001",
      "type": "rect",
      "element_type": "shape",
      "left": 50,
      "top": 680,
      "width": 500,
      "height": 4,
      "fill": "#B8965A",
      "rx": 0,
      "ry": 0,
      "originX": "left",
      "originY": "top",
      "label": null,
      "required": false,
      "editable": false,
      "permissions": {
        "content": "fixed",
        "position": "locked",
        "size": "locked",
        "rotation": "locked",
        "delete": "no"
      }
    }

  ]
}
```

**When Text and Image are `enabled: false` (component_permissions block only):**

```json
{
  "version": "5.4.0",
  "background": "#FAF7F2",
  "canvasWidth": 600,
  "canvasHeight": 800,

  "component_permissions": {
    "text": {
      "enabled": false,
      "allow_add": false,
      "max_elements": null
    },
    "image": {
      "enabled": false,
      "allow_add": false,
      "max_elements": null
    },
    "shape": {
      "enabled": true,
      "allow_add": false,
      "max_elements": null
    },
    "background": {
      "enabled": true,
      "allow_add": false,
      "max_elements": 1
    }
  },

  "objects": [
    {
      "id": "bg-001",
      "element_type": "background",
      "permissions": { "content": "fixed", "position": "locked", "size": "locked", "rotation": "locked", "delete": "no" }
    },
    {
      "id": "title-001",
      "element_type": "text",
      "text": "HAPPY BIRTHDAY",
      "permissions": { "content": "fixed", "position": "locked", "size": "locked", "rotation": "locked", "delete": "no" }
    }
  ]
}
```

Note: Text and image objects still appear in the `objects` array so the canvas renders them. The `component_permissions.text.enabled: false` tells the editor to hide all text tools and block any interaction with text objects. The objects themselves remain visible but are completely non-interactive.

---

### 9. The `component_permissions` block — full design

```json
{
  "component_permissions": {

    "text": {
      "enabled": true,
      "allow_add": false,
      "max_elements": null,
      "_notes": [
        "enabled:false → hide 'Add Text' button entirely, lock all text objects",
        "allow_add:false → existing text elements only, customer cannot add new ones",
        "max_elements: null means no limit; integer enforces a cap"
      ]
    },

    "image": {
      "enabled": true,
      "allow_add": false,
      "max_elements": null,
      "_notes": [
        "enabled:false → hide ImageUpload panel entirely, lock all image objects",
        "allow_add:false → pre-placed images only, customer cannot upload new ones",
        "max_elements: null means no cap; integer limits uploads"
      ]
    },

    "shape": {
      "enabled": false,
      "allow_add": false,
      "max_elements": null,
      "_notes": [
        "enabled:false → hide all shape tools (future shape toolbar)",
        "allow_add:false → no shape-add button shown to customer"
      ]
    },

    "background": {
      "enabled": true,
      "allow_add": false,
      "max_elements": 1,
      "_notes": [
        "enabled:false → background is invisible / completely locked",
        "allow_add always false — background is set by admin only",
        "max_elements always 1"
      ]
    }

  }
}
```

**Field definitions:**

| Field | Type | Meaning |
|---|---|---|
| `enabled` | boolean | If false: component type's entire UI section is hidden; all existing elements of that type are non-interactive (no selection, no editing) |
| `allow_add` | boolean | If false: the "Add Text" / "Upload Image" / shape tools are hidden; customer cannot add new elements of this type (even if enabled:true) |
| `max_elements` | integer \| null | Maximum number of elements of this type the customer can add (only relevant if `allow_add:true`). null = no limit |

---

## SECTION 4 — Customer Editor Impact

### 10. Per-permission editor behaviour

**`component_permissions.text.enabled: false`**
- Hide the `AddTextButton` component entirely (currently `App.jsx:65`)
- Remove the "Add Text" button from left panel
- All text objects on canvas: set `selectable: false`, `evented: false`
- When customer clicks a text object: nothing happens — no selection, no properties panel
- Right panel: `TextControls` must never render for these objects
- Keyboard shortcuts: Delete key must not fire for text objects
- PropertiesPanel: must check `element_type === 'text'` against `component_permissions.text.enabled` before rendering `TextControls`

**`component_permissions.image.enabled: false`**
- Hide the `ImageUpload` component entirely (currently `App.jsx:64`)
- All image objects on canvas: set `selectable: false`, `evented: false`
- Right panel: filter/opacity/remove-bg/size sections must not render for these objects
- Keyboard Delete must not fire for image objects

**`content: fixed`**
- Object is rendered on canvas but is entirely non-interactive
- Set Fabric.js properties: `selectable: false`, `evented: false`, `hoverCursor: 'default'`
- Object does NOT appear in a left-panel layers list for the customer
- Right panel: shows nothing for this object (cannot even be selected)
- Keyboard Delete: blocked

**`content: replaceable`**
- For text: customer can click the object and change the text content only
  - Show a constrained text input (not inline Fabric.js IText editing — or limit IText to text-only interaction)
  - Hide font picker, size input, colour picker (these are governed by `font_family`, `font_size`, `font_color` permissions)
  - Set `selectable: true`, but lock all transform controls: `hasControls: false` (unless `size: dynamic`), `lockMovementX/Y: true` (unless `position: dynamic`)
- For image: customer can click to replace the image (trigger file upload)
  - Do NOT show filter/opacity controls unless those have separate permissions
  - Set `selectable: true` but restrict to replacement interaction only

**`content: full_control`**
- For text: full editing — text content, plus whatever font/size/colour permissions allow
- For image: full editing — replacement, filters, opacity, remove-BG
- Object is selectable and interactive

**`position: locked`**
Exact Fabric.js properties to set:
```js
obj.set({
  lockMovementX: true,
  lockMovementY: true
})
```
Hide X/Y position inputs in PropertiesPanel (currently `PropertiesPanel.jsx:192–211`)

**`position: dynamic`**
Exact Fabric.js properties to set:
```js
obj.set({
  lockMovementX: false,
  lockMovementY: false
})
```
Canvas boundary enforcement still applies via `canvasBounds.js` — the `constrainToBounds()` listener is already in place for all objects. Show X/Y position inputs in PropertiesPanel.

**`size: locked`**
Exact Fabric.js properties to set:
```js
obj.set({
  lockScalingX: true,
  lockScalingY: true,
  lockUniScaling: true
})
obj.setControlsVisibility({
  ml: false, mr: false, mt: false, mb: false,
  tl: false, tr: false, bl: false, br: false
})
```

**`size: dynamic`**
```js
obj.set({
  lockScalingX: false,
  lockScalingY: false
})
obj.setControlsVisibility({
  tl: true, tr: true, bl: true, br: true
})
```

**`rotation: locked`**
```js
obj.set({ lockRotation: true })
obj.setControlsVisibility({ mtr: false })
```

**`rotation: dynamic`**
```js
obj.set({ lockRotation: false })
obj.setControlsVisibility({ mtr: true })
```

**`font_family: locked`**
- In `TextControls.jsx`: do not render the `<select className="font-picker">` (currently line 111–118)
- The admin-set font family must be preserved exactly

**`font_family: dynamic`**
- Render the font picker dropdown (already exists in `TextControls.jsx:111–118`)
- Full 15-font `FONT_LIST` from `fontLoader.js` is available
- A restricted font list could be added as a future field `allowed_fonts: []` in the permission block

**`font_size: locked`**
- In `TextControls.jsx`: do not render the size `<input>` (line 124–131)
- Fabric.js: `obj.set({ lockScalingX: true, lockScalingY: true })` for resize handles also
- Do not render the size section label either

**`font_size: dynamic`**
- Render size input (already exists in `TextControls.jsx:124–131`)

**`font_color: locked`**
- In `TextControls.jsx`: do not render the `<input type="color">` (line 133–137)

**`font_color: dynamic`**
- Render colour picker (already exists in `TextControls.jsx:133–137`)

---

### 11. When 2 component types are `enabled: false`

Example: `text.enabled: false` and `image.enabled: false`

**Toolbar changes (left panel):**
- `ImageUpload` component: entirely removed from DOM — upload zone, drop handler, file input all gone
- `AddTextButton` component: entirely removed from DOM — button gone
- Left panel becomes empty (only the "Tools" label remains) — should show an empty state message

**Canvas changes:**
- All text objects: `selectable: false, evented: false` — visually present, cannot be touched
- All image objects: `selectable: false, evented: false` — visually present, cannot be touched
- Canvas click on these objects: no selection, no `selection:created` event fires

**Right panel (PropertiesPanel):**
- `TextControls` will never render because text objects cannot be selected
- Image filter/opacity sections will never render because image objects cannot be selected
- Panel shows "Select an object to edit its properties" indefinitely if only disabled types exist

**Keyboard shortcuts:**
- Delete / Backspace: the handler in `useFabricCanvas.js:27–37` calls `fc.getActiveObject()`. Since disabled-type objects cannot be selected, the active object is null — Delete fires but does nothing. No additional guard needed unless a selection somehow exists.
- Ctrl+Z / Ctrl+Y: undo/redo still work for any remaining enabled-type objects

**If customer somehow triggers the tool (defensive):**
- If `canvas.add()` is called programmatically for a disabled type, the templateLoader should refuse to allow it
- A guard function `isComponentEnabled(type)` should wrap all canvas-mutation code
- Example: `if (!isComponentEnabled('text')) return` at the top of AddTextButton's click handler

---

## SECTION 5 — Implementation Plan

### 12. Files that need to change

**Customer Editor (`design-editor/`):**

| File | Current permission state | Changes needed | Complexity |
|---|---|---|---|
| `src/config/editorConfig.js` | Reads `designType` but doesn't use it | No change needed — already exports `designType` | None |
| `src/App.jsx` | Ignores `designType`; hardcodes canvas dimensions; no template loading | Branch on `designType`; pass template data down; conditionally render `ImageUpload`/`AddTextButton` based on `component_permissions`; pass `component_permissions` to all child components | **Rewrite** |
| `src/utils/templateLoader.js` | **Does not exist** | Create: fetch Metaobject by designId, parse `template_json`, return structured template data with `component_permissions` and `objects` | **New file** |
| `src/hooks/useFabricCanvas.js` | Creates canvas with no permission awareness; Delete key deletes any object | Add permission map parameter; apply lock flags on canvas init; guard Delete key against `delete: 'no'` objects and disabled-component objects | **Medium change** |
| `src/components/DesignCanvas.jsx` | Fixed 600×500 dimensions; no template rendering | Accept `templateData` prop; use template `canvasWidth`/`canvasHeight`; call templateLoader logic on canvas ready to render pre-placed objects | **Medium change** |
| `src/components/AddTextButton.jsx` | Always adds fully editable IText | Gate on `component_permissions.text.enabled` and `allow_add`; return null if disabled | **Small change** |
| `src/components/ImageUpload.jsx` | Always uploads; no permission checks | Gate on `component_permissions.image.enabled` and `allow_add`; return null if disabled | **Small change** |
| `src/components/PropertiesPanel.jsx` | Always shows all controls for selected type | Check permissions on selected object; gate position inputs on `position: dynamic`; gate delete button on `delete: yes`; pass permissions to TextControls | **Medium change** |
| `src/components/TextControls.jsx` | Shows all controls (font, size, colour) always | Accept `permissions` prop; conditionally hide font picker, size input, colour picker based on `font_family`, `font_size`, `font_color` values; gate text content editing on `content` permission | **Medium change** |
| `src/utils/canvasBounds.js` | Applies boundary constraints to all objects | No change needed — boundary enforcement is always correct | None |
| `src/utils/shapeClipPath.js` | Applies SVG clip path | No change needed | None |

**Admin Dashboard (`parties-signs-admin/`):**

| File | Current permission state | Changes needed | Complexity |
|---|---|---|---|
| `src/utils/exportTemplate.js` | Exports `permissions` per object; no `component_permissions` block | Add `component_permissions` block generation from template-level settings; bump schema version to `5.4.0` | **Small change** |
| `src/data/mockData.js` | Has per-object permissions; no `component_permissions` block | Add `component_permissions` to all 4 mock templates | **Small change** |
| `src/components/builder/TemplateBuilderMode.jsx` | No component-level enable/disable UI | Add component slots toggle section (4 enable/disable toggles); pass to export | **Medium change** |
| `src/components/builder/BuilderCanvas.jsx` | Does not enforce permissions beyond visual hints | No changes needed for the admin side — it's a design tool, not enforcement | None |
| `src/components/builder/PermissionsPanel.jsx` | Full permission UI exists (all 9 fields) | No changes needed — already complete | None |

---

### 13. Correct implementation order

1. **Create `templateLoader.js` in customer editor** — fetch Metaobject, parse `template_json`, return `{ templateData, componentPermissions, objects }`. This is the foundation everything depends on. Stub with mock data first.

2. **Add `component_permissions` to admin's `exportTemplate.js`** — bump version to `5.4.0`, add the block to `buildTemplateJSON()` output.

3. **Update `mockData.js`** — add `component_permissions` to all 4 mock templates so they match the new schema.

4. **Update `DesignCanvas.jsx`** — accept `templateData` prop; use `canvasWidth`/`canvasHeight` from template; after canvas init, iterate `objects` array and render each with the correct Fabric.js type and lock flags from `permissions`.

5. **Create a `applyObjectPermissions(obj, permissions)` helper** in `design-editor/src/utils/` — single function that takes a Fabric.js object and a permissions object and sets all lock flags. Centralising this prevents repetition and errors.

6. **Update `useFabricCanvas.js`** — accept an `objectPermissions` map (id → permissions); in the Delete key handler, check `permissions[active.id]?.delete !== 'no'` before removing; apply `constrainToBounds` only to `position: dynamic` objects.

7. **Update `TextControls.jsx`** — accept a `permissions` prop; conditionally hide font picker, size input, colour picker based on `font_family`, `font_size`, `font_color`.

8. **Update `PropertiesPanel.jsx`** — read `selectedObject.__permissions` (stored on the Fabric object during template load); gate position X/Y inputs, delete button; pass permissions to `TextControls`.

9. **Update `AddTextButton.jsx`** — accept `componentPermissions` prop; return null if `text.enabled === false` or `text.allow_add === false`.

10. **Update `ImageUpload.jsx`** — same pattern: return null if `image.enabled === false` or `image.allow_add === false`.

11. **Update `App.jsx`** — wire `templateLoader.js` into startup; branch on `designType`; pass `component_permissions` down to `DesignCanvas`, `AddTextButton`, `ImageUpload`, `PropertiesPanel`.

12. **Add `TemplateBuilderMode.jsx` component-level toggle UI** (admin dashboard) — 4 toggles for text/image/shape/background enabled status.

13. **End-to-end test** — load a template with `text.enabled: false`; verify Add Text button is gone and existing text is non-interactive.

---

### 14. Conflicts and breaking changes

**Will the new JSON schema break existing mock template data?**

YES — partially. The existing 4 mock templates in `mockData.js` do not have a `component_permissions` block. When the customer editor's `templateLoader.js` is written, it must default to `enabled: true` / `allow_add: false` for all component types when `component_permissions` is missing. This provides backwards compatibility with existing template JSONs.

The `version` field should be checked: `5.3.0` = old schema (no `component_permissions`); `5.4.0` = new schema. The loader should gracefully handle both.

**Will changes to `templateLoader.js` affect canvas mode?**

NO — canvas mode (`designType: 'canvas'`) starts with an empty canvas and no template JSON. `templateLoader.js` would only be called when `designType === 'template'`. Canvas mode code path remains unchanged.

**Fabric.js version mismatch (CRITICAL):**

The customer editor (`design-editor/`) uses **Fabric.js v5** — evidenced by `import { fabric } from 'fabric'` throughout all files (`PropertiesPanel.jsx:2`, `AddTextButton.jsx:1`, `ImageUpload.jsx:2`, `imageTools.js:1`, `useFabricCanvas.js:2`, `shapeClipPath.js:1`).

The admin dashboard (`parties-signs-admin/`) uses **Fabric.js v7** — evidenced by named imports: `import { Canvas, IText, Rect, FabricImage } from 'fabric'`.

This version difference means:

| Operation | v5 API (customer editor) | v7 API (admin dashboard) |
|---|---|---|
| Canvas init | `new fabric.Canvas(el)` | `new Canvas(el)` |
| Create text | `new fabric.IText(...)` | `new IText(...)` |
| Load image | `fabric.Image.fromURL(url, callback, opts)` | `FabricImage.fromURL(url, opts).then(img => ...)` |
| Set background | `canvas.setBackgroundColor(color, callback)` | `canvas.backgroundColor = color; canvas.requestRenderAll()` |
| Create path | `new fabric.Path(...)` | `new Path(...)` |

The `templateLoader.js` written for the customer editor **must use v5 API**, not v7. Any copy-paste from the admin dashboard code will break.

Additionally, `imageTools.js:47` uses the v5 callback form of `setSrc`: `fabricImage.setSrc(newUrl, () => {...}, opts)`. In v7 this is async. Since the customer editor uses v5, this is correct and should not be "fixed" to v7 style.

The `useUndoRedo.js:4` CUSTOM_PROPS list includes `'editable'` — this is Fabric.js's own `IText.editable` property (controls inline text editing) and should not be confused with the admin permission `permissions.content`. The admin permission system uses a separate `__permissions` property that will need to be added to the CUSTOM_PROPS list once the system is implemented: `const CUSTOM_PROPS = ['id', 'editable', 'clipPath', 'lockMovementX', 'lockMovementY', '__permissions', 'element_type']`.

---

## Summary Table

| Feature | Admin Dashboard | Customer Editor |
|---|---|---|
| Permission schema defined | YES — complete 9-field system | N/A |
| Permission UI for admin | YES — PermissionsPanel.jsx | N/A |
| Permissions exported to JSON | YES — exportTemplate.js:41–44 | N/A |
| component_permissions block | NO — not yet in schema | NOT IMPLEMENTED |
| templateLoader.js | N/A | NOT IMPLEMENTED |
| content:fixed enforcement | Partial (visual border only, admin preview) | NOT IMPLEMENTED |
| content:replaceable enforcement | Partial (visual border only) | NOT IMPLEMENTED |
| content:full_control enforcement | Partial (visual border only) | NOT IMPLEMENTED |
| position:locked enforcement | YES — syncPermissionsToCanvas:203–204 | NOT IMPLEMENTED |
| size:locked enforcement | YES — syncPermissionsToCanvas:205–206 | NOT IMPLEMENTED |
| rotation:locked enforcement | YES — syncPermissionsToCanvas:207 | NOT IMPLEMENTED |
| font_family:locked enforcement | NO — not applied to canvas | NOT IMPLEMENTED |
| font_size:locked enforcement | NO — not applied to canvas | NOT IMPLEMENTED |
| font_color:locked enforcement | NO — not applied to canvas | NOT IMPLEMENTED |
| delete permission enforcement | NO — only stored, not enforced | NOT IMPLEMENTED |
| Required field validation | NO — stored, not validated | NOT IMPLEMENTED |
| Admin preview in editor | PARTIAL — writes sessionStorage, editor never reads it | NOT IMPLEMENTED |
