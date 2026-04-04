import { useRef, useState, useEffect } from 'react';
import { Layers, Info, Upload, CheckCircle, AlertTriangle } from 'lucide-react';
import Button from '../ui/Button';
import { scaleSvgPathToCanvas, isValidSvgPath } from '../../utils/svgPathUtils';
import { parseSvgFileToPath } from '../../utils/svgPathUtils';

const PREVIEW_W = 280;
const PREVIEW_H = 320;

export default function ShapeEditor({
  shape,
  customSvgPath,
  onCustomSvgChange,
  targetWidth,
  targetHeight,
  uploadError,
}) {
  const [localUploadError, setLocalUploadError] = useState(null);
  const fileInputRef = useRef(null);

  const rawPath = shape?.svgPath || customSvgPath;
  const scaledPath = rawPath ? scaleSvgPathToCanvas(rawPath, PREVIEW_W, PREVIEW_H, 20) : null;

  useEffect(() => {
    setLocalUploadError(null);
  }, [shape]);

  const errorMsg = uploadError || localUploadError;

  function handleFileSelected(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const path = parseSvgFileToPath(ev.target.result);
      if (!path) {
        setLocalUploadError('No <path> found. Try simplifying your SVG in Inkscape.');
      } else {
        setLocalUploadError(null);
        onCustomSvgChange(path);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  if (!shape) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 40 }}>
        <Layers size={40} color="var(--light)" style={{ marginBottom: 12 }} />
        <p style={{ fontSize: 13, color: 'var(--light)', textAlign: 'center' }}>
          Select a shape from the library
        </p>
      </div>
    );
  }

  if (shape.id === 'custom') {
    return (
      <div>
        <div className="upload-requirements">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Info size={16} color="var(--blue-tx)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--blue-tx)' }}>
              Upload your own SVG file
            </span>
          </div>
          <ul>
            <li>The SVG must contain a single &lt;path&gt; element</li>
            <li>Designed in Inkscape, Illustrator, or Figma</li>
            <li>Export as SVG (not SVGZ, not SVG with XML header only)</li>
            <li>The shape should fill most of the SVG artboard</li>
            <li>Tip: use vectorizer.ai to convert a PNG to SVG free</li>
          </ul>
        </div>

        {!customSvgPath ? (
          <>
            <Button
              variant="primary"
              icon={Upload}
              onClick={() => fileInputRef.current?.click()}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Upload SVG File
            </Button>
            {errorMsg && (
              <div style={{
                marginTop: 10,
                background: 'var(--red-bg)',
                border: '1px solid var(--red-tx)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 12px',
                fontSize: 12,
                color: 'var(--red-tx)',
              }}>
                {errorMsg}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="shape-success-msg">
              <CheckCircle size={14} />
              <span>Shape loaded successfully</span>
            </div>
            <p className="shape-path-stats">Path length: {customSvgPath.length} characters</p>
            {customSvgPath.length > 5000 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <AlertTriangle size={13} color="var(--amber-tx)" />
                <span style={{ fontSize: 11, color: 'var(--amber-tx)' }}>
                  Complex path — may affect performance
                </span>
              </div>
            )}

            <div style={{ marginTop: 16, marginBottom: 12 }}>
              <Button
                variant="outline"
                icon={Upload}
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Upload Different File
              </Button>
            </div>

            <div className="shape-preview-box" style={{ width: PREVIEW_W, height: PREVIEW_H }}>
              <svg width={PREVIEW_W} height={PREVIEW_H}>
                {scaledPath && (
                  <>
                    <path d={scaledPath} fill="rgba(33,150,243,0.1)" stroke="#2196F3" strokeWidth="2" strokeDasharray="8 4" />
                    <path d={scaledPath} fill="none" stroke="#e74c3c" strokeWidth="1.5" />
                  </>
                )}
              </svg>
            </div>
            <p style={{ fontSize: 11, color: 'var(--mid)', textAlign: 'center', marginTop: 8 }}>
              This shape will scale to {targetWidth} × {targetHeight}px automatically when applied to the canvas
            </p>
          </>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".svg,image/svg+xml"
          style={{ display: 'none' }}
          onChange={handleFileSelected}
        />
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, marginBottom: 4 }}>{shape.name}</h3>
      <p style={{ fontSize: 13, color: 'var(--mid)', marginBottom: 8 }}>{shape.description}</p>
      <span style={{
        display: 'inline-block',
        fontSize: 11,
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 20,
        background: 'var(--cream2)',
        color: 'var(--mid)',
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>
        {shape.category}
      </span>

      <div className="shape-preview-box" style={{ width: PREVIEW_W, height: PREVIEW_H }}>
        <svg width={PREVIEW_W} height={PREVIEW_H}>
          {shape.id === 'rectangle' ? (
            <rect
              x={20} y={20}
              width={PREVIEW_W - 40}
              height={PREVIEW_H - 40}
              fill="rgba(33,150,243,0.1)"
              stroke="#2196F3"
              strokeWidth="2"
              strokeDasharray="8 4"
            />
          ) : scaledPath ? (
            <>
              <path d={scaledPath} fill="rgba(33,150,243,0.1)" stroke="#2196F3" strokeWidth="2" strokeDasharray="8 4" />
              <path d={scaledPath} fill="none" stroke="#e74c3c" strokeWidth="1.5" />
            </>
          ) : null}
        </svg>
      </div>
      <p style={{ fontSize: 11, color: 'var(--mid)', textAlign: 'center', marginTop: 8 }}>
        This shape will scale to {targetWidth} × {targetHeight}px automatically when applied to the canvas
      </p>
    </div>
  );
}
