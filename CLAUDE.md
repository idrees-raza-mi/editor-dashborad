# Parties & Signs — Admin Dashboard CLAUDE.md

## Project Purpose
Admin dashboard for Parties & Signs Shopify store.
Separate app from customer editor.
Allows admin to: create templates, configure canvases,
set permissions per element, manage size variants,
and upload everything to Shopify Metaobjects.

## Tech Stack
React + Vite, React Router v6, Lucide React, Fabric.js (builder canvas)
Vercel hosting + api/shopify.js serverless proxy

## Design System — CRITICAL RULES
- Theme: warm cream/beige — NOT dark, NOT generic, NOT purple
- All colors: CSS variables from src/styles/theme.css
- Headings: Playfair Display (Google Font)
- Body text: Jost (Google Font)
- Icons: Lucide React ONLY. No emoji. No unicode.
- Buttons: ALWAYS have a Lucide icon on the left
- Status badges: ALWAYS use design system colors with CSS dot
- Cards: white bg, 1px var(--border), border-radius var(--radius)
- Hover: box-shadow var(--shadow) transition 0.15s
- No browser alert() or confirm() — always inline modals

## Template Cards — CRITICAL
Cards MUST be exactly 280px wide. Never wider.
Grid: grid-template-columns: repeat(auto-fill, minmax(280px, 280px))
Container: justify-content: start
This prevents cards from stretching on wide screens.

## Variants System
Both templates and canvases support up to 3 size variants.
Each variant: { id, label, price, canvasWidth, canvasHeight, svgPath? }
Stored as JSON string in metaobject field 'variants_json'.
VariantsEditor component handles add/edit/delete with max 3 limit.

## Routes
/ → /templates (redirect)
/templates → Templates & Canvases (two tabs: templates + canvases)
/builder → Builder page (two modes: template / canvas config)
/settings → Settings placeholder

## State Management
AppContext provides: templates, canvases, update/add/delete functions.
All state in memory (React state). No localStorage.
Mock data initialized from src/data/mockData.js.
Real data would come from Shopify Admin API.

## Shape Creator (Canvas Config)
Admin sets a shape boundary per variant using ShapeCreator modal.
Flow: Click "Set Shape" → ShapeCreator opens → Pick preset or upload SVG → "Use This Shape"
Preset shapes: 14 built-in shapes in src/data/presetShapes.js
Custom: admin uploads an SVG file, path is extracted from <path d="..."> element
Rectangle (null svgPath) = no clip path = full rectangular canvas
Each variant can have a different shape.
Shape is stored as SVG path string in variant.svgPath.

## Fabric.js v7 API (CRITICAL)
Named imports only — NOT `import { fabric } from 'fabric'`
Correct: import { Canvas, IText, Rect, FabricImage, Path, util } from 'fabric'
FabricImage.fromURL(url, opts) returns Promise — use .then() or await
canvas.backgroundColor = color (NOT setBackgroundColor)
canvas.sendObjectToBack(obj) (NOT sendToBack)
canvas.clipPath = new Path(scaledPath, { absolutePositioned: true })
await fabricImage.setSrc(url, { crossOrigin: 'anonymous' }) — async in v7

## SVG Path Utilities (src/utils/svgPathUtils.js)
scaleSvgPathToCanvas(pathString, targetW, targetH, padding) — scales SVG path to fit canvas
isValidSvgPath(pathString) — validates path starts with M/m and has valid bbox
parseSvgFileToPath(svgString) — extracts d attribute from first <path> in SVG file
getPathBoundingBox(pathString) — returns bbox using DOM

## Export & Save (Phase 08)
Export flow uses ExportProgressModal with step-by-step tracking.
Dev mode (hostname === 'localhost'): all steps simulated with timeouts, no real API calls.
Production: Vercel serverless proxy at /api/shopify handles all Shopify Admin API calls.
Export steps for templates: build JSON → upload preview image → save metaobject → done
Export steps for canvases: build config → save metaobject → done
After successful export, navigate('/templates') is called automatically.

## Shopify Metaobject Types Required
Create these in Shopify Admin before using export:

design_template:
  name, category, canvas_width, canvas_height, background_color,
  template_json, preview_image_url, variants_json, created_at

canvas_config:
  name, category, variants_json, created_at

## File Map
src/styles/theme.css — CSS variables and design tokens
src/styles/global.css — resets and base styles
src/styles/builder.css — builder + shape creator styles
src/data/mockData.js — initial mock templates and canvases
src/data/presetShapes.js — 14 preset shape paths for ShapeCreator
src/context/AppContext.jsx — global state provider
src/App.jsx — router setup
src/pages/TemplatesPage.jsx — main listing page
src/pages/BuilderPage.jsx — template builder + canvas config
src/pages/SettingsPage.jsx — placeholder settings
src/components/layout/Sidebar.jsx — persistent sidebar (220px dark)
src/components/layout/PageShell.jsx — main layout wrapper
src/components/ui/Button.jsx — button variants (primary/outline/ghost/danger)
src/components/ui/Badge.jsx — status badges (uploaded/not_uploaded)
src/components/ui/StatCard.jsx — dashboard stat cards
src/components/ui/Tabs.jsx — tab navigation
src/components/ui/EmptyState.jsx — empty list states
src/components/ui/Toast.jsx — toast notifications
src/components/templates/TemplateCard.jsx — 280px card
src/components/templates/CanvasCard.jsx — 280px card
src/components/templates/TemplateGrid.jsx — searchable grid with empty state
src/components/templates/CanvasGrid.jsx — searchable grid with empty state
src/components/builder/LayersPanel.jsx — element layers
src/components/builder/PermissionsPanel.jsx — permission controls per element
src/components/builder/BuilderCanvas.jsx — visual Fabric.js canvas
src/components/builder/TemplateBuilderMode.jsx — 3-panel builder layout
src/components/builder/CanvasConfigMode.jsx — canvas settings + shape picker
src/components/builder/VariantsEditor.jsx — size variants (max 3)
src/components/builder/SVGShapePreview.jsx — SVG shape preview
src/components/builder/ConfiguratorCanvas.jsx — Fabric.js canvas config preview
src/components/builder/ShapeCreator.jsx — shape picker modal
src/components/builder/ShapeLibrary.jsx — preset shape grid
src/components/builder/ShapeEditor.jsx — shape preview + custom upload
src/components/modals/ModalOverlay.jsx — base modal wrapper
src/components/modals/PreviewModal.jsx — item preview popup
src/components/modals/ConfirmModal.jsx — confirmation dialog
src/components/modals/ExportProgressModal.jsx — export steps
src/utils/exportTemplate.js — JSON builders (buildTemplateJSON, buildTemplateMetaobjectFields, buildCanvasMetaobjectFields)
src/utils/shopifyAdmin.js — callAdminProxy, uploadImageToShopify
src/utils/svgPathUtils.js — SVG path utilities
src/utils/removeBackground.js — AI background removal
api/shopify.js — Vercel serverless proxy (stagedUpload, createFile, createMetaobject, updateMetaobject)

## Environment Variables
VITE_ADMIN_PASSWORD — admin login password
VITE_SHOPIFY_STORE — store domain (your-store.myshopify.com)
VITE_SHOPIFY_ADMIN_TOKEN — Shopify Admin API access token
VITE_CUSTOMER_EDITOR_URL — URL to customer-facing editor app
Server-side (Vercel): SHOPIFY_STORE_URL, SHOPIFY_ADMIN_TOKEN

## Development
Run with: vercel dev (not npm run dev) to enable serverless proxy locally on port 3000
Standard Vite dev: npm run dev (port 5173, no proxy support)

## Common Issues
- Cards stretching: check justify-content: start on grid container
- Fonts not loading: check Google Fonts import in global.css
- Proxy failing: run vercel dev not npm run dev
- Metaobject save fails: check SHOPIFY_ADMIN_TOKEN in Vercel env vars
- SVG not previewing: path must be valid SVG path d attribute string
- Fabric v7 errors: always use named imports, check API changes from v5
