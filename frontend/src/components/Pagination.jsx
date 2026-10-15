import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({
  pageNumber = 0,
  pageSize = 6,
  totalElements = 0,
  totalPages = 1,
  isLast = false,
  onPageChange,
  onPageSizeChange
}) {
  if (totalElements === 0) return null;

  const startItem = pageNumber * pageSize + 1;
  const endItem = Math.min((pageNumber + 1) * pageSize, totalElements);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '1rem',
      marginTop: '2rem',
      padding: '1rem 1.25rem',
      background: '#ffffff',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
        Showing <strong>{startItem}</strong> to <strong>{endItem}</strong> of <strong>{totalElements}</strong> reports
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {onPageSizeChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              style={{
                padding: '0.25rem 0.5rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                background: '#fff'
              }}
            >
              <option value={6}>6</option>
              <option value={9}>9</option>
              <option value={12}>12</option>
              <option value={24}>24</option>
            </select>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            type="button"
            className="btn-outline"
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.85rem' }}
            disabled={pageNumber <= 0}
            onClick={() => onPageChange(pageNumber - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft size={16} /> Prev
          </button>

          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', padding: '0 0.5rem' }}>
            Page {pageNumber + 1} of {Math.max(totalPages, 1)}
          </span>

          <button
            type="button"
            className="btn-outline"
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.85rem' }}
            disabled={pageNumber >= totalPages - 1 || isLast}
            onClick={() => onPageChange(pageNumber + 1)}
            aria-label="Next page"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
