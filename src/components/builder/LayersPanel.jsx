import { useState } from 'react';
import { Type, ImageIcon, Square, Layout, Edit2, Lock, X, AlertTriangle, GripVertical } from 'lucide-react';

const TYPE_ICONS = {
  text:       Type,
  image:      ImageIcon,
  shape:      Square,
  background: Layout,
};

function AddBtn({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        padding: 8,
        fontSize: 12,
        background: 'white',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        color: 'var(--mid)',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
      onMouseLeave={e => e.currentTarget.style.background = 'white'}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

function LayerRow({ el, isSelected, onSelect, onDelete, componentSettings, onDragStart, onDragOver, onDrop, isDragOver, isDragging }) {
  const [hovered, setHovered] = useState(false);
  const Icon = TYPE_ICONS[el.type] || Square;
  const isEditable =
    el.permissions?.content !== 'fixed' ||
    el.permissions?.position === 'dynamic';
  const willBeDisabled = componentSettings && componentSettings[el.type]?.enabled === false;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, el.id)}
      onDragOver={(e) => onDragOver(e, el.id)}
      onDrop={(e) => onDrop(e, el.id)}
      onClick={() => onSelect(el.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        padding: '8px 10px 8px 14px',
        cursor: 'grab',
        background: isSelected ? 'var(--cream2)' : isDragOver ? '#FDF8F2' : hovered ? 'var(--cream)' : 'white',
        borderLeft: `3px solid ${isSelected ? 'var(--gold)' : 'transparent'}`,
        borderTop: isDragOver ? '2px solid var(--gold)' : 'none',
        opacity: isDragging ? 0.4 : 1,
        transition: 'all 0.12s',
      }}
    >
      <GripVertical size={14} color="var(--light)" style={{ flexShrink: 0, marginTop: 1, cursor: 'grab' }} />
      <Icon size={16} color={willBeDisabled ? '#E65100' : 'var(--mid)'} style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
        <span style={{
          fontSize: 13,
          fontWeight: isSelected ? 600 : 400,
          color: willBeDisabled ? '#E65100' : 'var(--black)',
          display: 'block',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {el.name}
        </span>
        {willBeDisabled && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            fontSize: 9,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            background: '#FFF3E0',
            color: '#E65100',
            padding: '1px 5px',
            borderRadius: 8,
            marginTop: 2,
            border: '1px solid #FFB74D',
          }}>
            <AlertTriangle size={8} />
            Disabled
          </span>
        )}
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onDelete(el.id); }}
        title="Delete element"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--red-tx)', display: 'flex', alignItems: 'center',
          padding: 2, flexShrink: 0, marginTop: 1,
          opacity: hovered ? 1 : 0,
        }}
        onMouseEnter={e => { e.stopPropagation(); e.currentTarget.style.opacity = 1; }}
        onMouseLeave={e => { e.stopPropagation(); e.currentTarget.style.opacity = 0; }}
      >
        <X size={14} />
      </button>

      {!willBeDisabled && (
        isEditable
          ? <Edit2 size={14} color="var(--gold)" style={{ flexShrink: 0, marginTop: 1 }} />
          : <Lock size={14} color="var(--light)" style={{ flexShrink: 0, marginTop: 1 }} />
      )}
    </div>
  );
}

export default function LayersPanel({
  elements,
  selectedElementId,
  onSelectElement,
  onAddElement,
  onDeleteElement,
  onElementsChange,
  componentSettings,
}) {
  const [dragState, setDragState] = useState({ draggedId: null, dragOverId: null });

  function handleDragStart(e, elementId) {
    setDragState(prev => ({ ...prev, draggedId: elementId }));
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', elementId);
  }

  function handleDragOver(e, elementId) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (elementId !== dragState.draggedId) {
      setDragState(prev => ({ ...prev, dragOverId: elementId }));
    }
  }

  function handleDragLeave() {
    setDragState(prev => ({ ...prev, dragOverId: null }));
  }

  function handleDrop(e, targetId) {
    e.preventDefault();
    const { draggedId } = dragState;
    setDragState({ draggedId: null, dragOverId: null });

    if (!draggedId || draggedId === targetId || !onElementsChange) return;

    const fromIdx = elements.findIndex(el => el.id === draggedId);
    const toIdx = elements.findIndex(el => el.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    const next = [...elements];
    const [removed] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, removed);
    onElementsChange(next);
  }

  function handleDragEnd() {
    setDragState({ draggedId: null, dragOverId: null });
  }

  return (
    <div style={{
      width: 200,
      flexShrink: 0,
      background: 'white',
      borderRight: '1px solid var(--border)',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: 'var(--mid)',
        padding: '12px 14px 8px',
        fontWeight: 600,
        flexShrink: 0,
      }}>
        Layers
      </div>

      {/* Layers list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {elements.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--light)', padding: '8px 14px' }}>
            No elements yet
          </div>
        )}
        {elements.map(el => (
          <LayerRow
            key={el.id}
            el={el}
            isSelected={el.id === selectedElementId}
            onSelect={onSelectElement}
            onDelete={onDeleteElement}
            componentSettings={componentSettings}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            isDragOver={dragState.dragOverId === el.id}
            isDragging={dragState.draggedId === el.id}
          />
        ))}
      </div>

      {/* Add Element section */}
      <div style={{ flexShrink: 0, borderTop: '1px solid var(--border)' }}>
        <div style={{
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--mid)',
          padding: '12px 14px 8px',
          fontWeight: 600,
        }}>
          Add Element
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 6,
          padding: '0 10px 12px',
        }}>
          <AddBtn icon={Type} label="Text" onClick={() => onAddElement('text')} />
          <AddBtn icon={ImageIcon} label="Image" onClick={() => onAddElement('image')} />
          <AddBtn icon={Square} label="Shape" onClick={() => onAddElement('shape')} />
          <AddBtn icon={Layout} label="Background" onClick={() => onAddElement('background')} />
        </div>
      </div>
    </div>
  );
}