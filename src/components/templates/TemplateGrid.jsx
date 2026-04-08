import { useState } from 'react';
import { Search, LayoutTemplate } from 'lucide-react';
import TemplateCard from './TemplateCard';
import EmptyState from '../ui/EmptyState';

export default function TemplateGrid({ templates, onPreview, onEdit, onUpload }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'uploaded' && t.status === 'uploaded') ||
      (statusFilter === 'not_uploaded' && t.status === 'not_uploaded');
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
            placeholder="Search templates..."
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
        {filtered.map(template => (
          <TemplateCard
            key={template.id}
            template={template}
            onPreview={onPreview}
            onEdit={onEdit}
            onUpload={onUpload}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <EmptyState
          icon={LayoutTemplate}
          title={search || statusFilter !== 'all' ? 'No templates found' : 'No templates yet'}
          message={search || statusFilter !== 'all'
            ? 'Try adjusting your search or filter.'
            : 'Create your first template in the Template Builder.'}
        />
      )}
    </div>
  );
}
