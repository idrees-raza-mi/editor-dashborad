import { useState } from 'react';
import { Search, Layers } from 'lucide-react';
import CanvasCard from './CanvasCard';
import EmptyState from '../ui/EmptyState';

export default function CanvasGrid({ canvases, onPreview, onEdit, onUpload }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = canvases.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'uploaded' && c.status === 'uploaded') ||
      (statusFilter === 'not_uploaded' && c.status === 'not_uploaded');
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{
            position: 'absolute',
            left: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--light)',
            pointerEvents: 'none',
          }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search canvases..."
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '7px 12px 7px 34px',
              fontSize: 13,
              background: 'white',
              color: 'var(--black)',
              outline: 'none',
              width: 220,
            }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '7px 12px',
            fontSize: 13,
            background: 'white',
            color: 'var(--black)',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="all">All</option>
          <option value="uploaded">Uploaded</option>
          <option value="not_uploaded">Not Uploaded</option>
        </select>
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 280px))',
        justifyContent: 'start',
        gap: 20,
        marginTop: 20,
      }}>
        {filtered.map(canvas => (
          <CanvasCard
            key={canvas.id}
            canvas={canvas}
            onPreview={onPreview}
            onEdit={onEdit}
            onUpload={onUpload}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <EmptyState
          icon={Layers}
          title={search || statusFilter !== 'all' ? 'No canvases found' : 'No canvases yet'}
          message={search || statusFilter !== 'all'
            ? 'Try adjusting your search or filter.'
            : 'Create your first canvas shape in the Canvas Config tab.'}
        />
      )}
    </div>
  );
}
