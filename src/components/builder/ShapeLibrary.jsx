import { Upload } from 'lucide-react';
import PRESET_SHAPES from '../../data/presetShapes';

const CATEGORY_ORDER = ['Basic', 'Popular', 'Party', 'Custom'];

function ShapePreview({ shape }) {
  if (shape.id === 'custom') {
    return (
      <div style={{ height: 60, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Upload size={28} color="var(--mid)" />
      </div>
    );
  }
  if (shape.id === 'rectangle') {
    return (
      <div style={{ height: 60, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="56" height="44">
          <rect x="2" y="2" width="52" height="40" fill="var(--mid)" rx="2" />
        </svg>
      </div>
    );
  }
  return (
    <div style={{ height: 60, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg viewBox={shape.viewBox} width="56" height="56" style={{ overflow: 'visible' }}>
        <path d={shape.svgPath} fill="var(--mid)" />
      </svg>
    </div>
  );
}

export default function ShapeLibrary({ selectedShapeId, onSelect }) {
  const grouped = CATEGORY_ORDER.map(cat => ({
    category: cat,
    shapes: PRESET_SHAPES.filter(s => s.category === cat),
  })).filter(g => g.shapes.length > 0);

  return (
    <div>
      {grouped.map(({ category, shapes }) => (
        <div key={category}>
          <div className="shape-category-label">{category}</div>
          <div className="shape-grid">
            {shapes.map(shape => (
              <div
                key={shape.id}
                className={`shape-card ${selectedShapeId === shape.id ? 'active' : ''}`}
                onClick={() => onSelect(shape)}
              >
                <ShapePreview shape={shape} />
                <span className="shape-card-name">{shape.name}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
