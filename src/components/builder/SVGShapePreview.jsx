import { Layers } from 'lucide-react';
import { isValidSvgPath, scaleSvgPathToCanvas } from '../../utils/svgPathUtils';

export default function SVGShapePreview({ svgPath, size = 120 }) {
  const isValid = svgPath && isValidSvgPath(svgPath);
  const scaledPath = isValid ? scaleSvgPathToCanvas(svgPath, size, size, 10) : null;

  return (
    <div style={{
      background: 'var(--cream2)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      width: size,
      height: size,
      borderRadius: 'var(--radius-sm)',
      gap: 4,
    }}>
      {scaledPath ? (
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ display: 'block' }}
        >
          <path d={scaledPath} fill="var(--mid)" />
        </svg>
      ) : (
        <>
          <Layers size={28} color="var(--light)" />
          <span style={{ fontSize: 10, color: 'var(--light)' }}>No shape</span>
        </>
      )}
    </div>
  );
}
