import React from 'react';
import ItemCard from './ItemCard';
import LoadingIndicator from './LoadingIndicator';
import { PackageOpen, AlertTriangle, RefreshCw } from 'lucide-react';

export default function ItemList({ 
  items = [], 
  loading = false, 
  error = null, 
  onRetry = null,
  emptyMessage = "No items match your criteria." 
}) {
  if (loading) {
    return <LoadingIndicator message="Loading reports from campus database..." />;
  }

  if (error) {
    return (
      <div className="empty-state" style={{ borderColor: '#fecaca', background: '#fef2f2' }}>
        <AlertTriangle size={48} color="var(--lost-color)" />
        <h3 style={{ color: '#991b1b', marginTop: '0.5rem' }}>Failed to Load Reports</h3>
        <p style={{ maxWidth: 500, margin: '0.5rem auto 1.25rem', color: '#7f1d1d', fontSize: '0.9rem' }}>
          {error}
        </p>
        {onRetry && (
          <button 
            onClick={onRetry} 
            className="btn-primary" 
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', margin: '0 auto' }}
          >
            <RefreshCw size={16} /> Retry Connection
          </button>
        )}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="empty-state">
        <PackageOpen size={48} />
        <h3>No Reports Found</h3>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="items-grid">
      {items.map(item => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}
