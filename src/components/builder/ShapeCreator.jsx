import { useState, useEffect } from 'react';
import { XCircle } from 'lucide-react';
import ModalOverlay from '../modals/ModalOverlay';
import Button from '../ui/Button';
import ShapeLibrary from './ShapeLibrary';
import ShapeEditor from './ShapeEditor';
import PRESET_SHAPES from '../../data/presetShapes';

export default function ShapeCreator({
  isOpen,
  currentSvgPath,
  variantLabel,
  targetWidth,
  targetHeight,
  onConfirm,
  onClose,
}) {
  const [selectedShape, setSelectedShape] = useState(null);
  const [customSvgPath, setCustomSvgPath] = useState(null);
  const [uploadError, setUploadError]     = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    if (currentSvgPath) {
      const preset = PRESET_SHAPES.find(s => s.svgPath === currentSvgPath);
      if (preset) {
        setSelectedShape(preset);
        setCustomSvgPath(null);
      } else {
        setSelectedShape(PRESET_SHAPES.find(s => s.id === 'custom'));
        setCustomSvgPath(currentSvgPath);
      }
    } else {
      setSelectedShape(PRESET_SHAPES.find(s => s.id === 'rectangle'));
      setCustomSvgPath(null);
    }
    setUploadError(null);
  }, [isOpen, currentSvgPath]);

  if (!isOpen) return null;

  const isCustom = selectedShape?.id === 'custom';
  const canConfirm = !isCustom || (isCustom && customSvgPath);

  let footerInfoText = '';
  if (!selectedShape || selectedShape.id === 'rectangle') {
    footerInfoText = 'No shape — full rectangle canvas';
  } else if (isCustom && !customSvgPath) {
    footerInfoText = 'Upload an SVG file to continue';
  } else if (isCustom && customSvgPath) {
    footerInfoText = 'Custom shape ready';
  } else {
    footerInfoText = `${selectedShape.name} selected`;
  }

  let confirmLabel = 'Use This Shape';
  if (!selectedShape || selectedShape.id === 'rectangle') {
    confirmLabel = 'Use Rectangle Canvas';
  } else if (isCustom && customSvgPath) {
    confirmLabel = 'Use Custom Shape';
  } else if (selectedShape) {
    confirmLabel = `Use ${selectedShape.name}`;
  }

  function handleConfirm() {
    const finalPath = isCustom ? customSvgPath : (selectedShape?.svgPath || null);
    onConfirm(finalPath);
    onClose();
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="shape-creator-modal">
        {/* Header */}
        <div className="shape-creator-header">
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, margin: 0 }}>
              Set Shape Boundary
            </h2>
            <p style={{ fontSize: 13, color: 'var(--mid)', marginTop: 2, marginBottom: 0 }}>
              Variant: {variantLabel}
            </p>
          </div>
          <Button variant="ghost" icon={XCircle} size="sm" onClick={onClose} />
        </div>

        {/* Body */}
        <div className="shape-creator-body">
          {/* Left: shape library */}
          <div className="shape-library-panel">
            <div className="shape-category-label" style={{ marginTop: 0 }}>CHOOSE A SHAPE</div>
            <ShapeLibrary
              selectedShapeId={selectedShape?.id || null}
              onSelect={(shape) => {
                setSelectedShape(shape);
                setCustomSvgPath(null);
                setUploadError(null);
              }}
            />
          </div>

          {/* Right: shape editor */}
          <div className="shape-editor-panel">
            <ShapeEditor
              shape={selectedShape}
              customSvgPath={customSvgPath}
              onCustomSvgChange={(path) => {
                setCustomSvgPath(path);
                setUploadError(null);
              }}
              targetWidth={targetWidth}
              targetHeight={targetHeight}
              uploadError={uploadError}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="shape-creator-footer">
          <span style={{ fontSize: 13, color: 'var(--mid)' }}>{footerInfoText}</span>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              disabled={!canConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
}
