import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, ShieldAlert, PlusCircle, XCircle, RefreshCw } from 'lucide-react';
import ItemList from '../components/ItemList';
import Pagination from '../components/Pagination';
import { CATEGORIES } from '../data/mockData';
import { fetchItemsPaged } from '../services/api';

export default function LostItemsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(6);

  const [pagedData, setPagedData] = useState({
    content: [],
    pageNumber: 0,
    pageSize: 6,
    totalElements: 0,
    totalPages: 0,
    last: true
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchItemsPaged({
        type: 'LOST',
        search: debouncedSearch,
        category: selectedCategory,
        status: selectedStatus,
        page,
        size,
        sortBy: 'createdAt',
        sortDir: 'desc'
      });
      setPagedData(res);
    } catch (err) {
      console.error('Failed to load lost items:', err);
      setError(err.message || 'Unable to load lost items from MySQL database.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedCategory, selectedStatus, page, size]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setSelectedCategory('ALL');
    setSelectedStatus('ALL');
    setPage(0);
  };

  const isFiltering = searchTerm || selectedCategory !== 'ALL' || selectedStatus !== 'ALL';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ color: 'var(--lost-color)' }}><ShieldAlert size={32} /></span>
            Lost Items Registry
          </h1>
          <p className="page-subtitle">Browse items currently reported missing by students and staff across campus.</p>
        </div>

        <Link to="/report-lost" className="btn-danger">
          <PlusCircle size={16} /> Report a Missing Item
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="filters-bar" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
        <div className="search-input-wrapper" style={{ flex: '1 1 260px' }}>
          <Search size={18} />
          <input
            type="text"
            className="search-input"
            placeholder="Search lost items by name, details, location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0 0.5rem' }}
            >
              <XCircle size={16} />
            </button>
          )}
        </div>

        <select
          className="select-filter"
          value={selectedCategory}
          onChange={(e) => { setSelectedCategory(e.target.value); setPage(0); }}
          style={{ flex: '0 1 180px' }}
        >
          {CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>

        <select
          className="select-filter"
          value={selectedStatus}
          onChange={(e) => { setSelectedStatus(e.target.value); setPage(0); }}
          style={{ flex: '0 1 140px' }}
        >
          <option value="ALL">All Statuses</option>
          <option value="OPEN">OPEN</option>
          <option value="CLAIMED">CLAIMED</option>
          <option value="RESOLVED">RESOLVED</option>
        </select>

        {isFiltering && (
          <button
            type="button"
            className="btn-outline"
            onClick={handleClearFilters}
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
          >
            Clear Filters
          </button>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1.25rem 0 1rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          {loading ? 'Searching lost registry...' : `Showing ${pagedData.totalElements} Lost Report${pagedData.totalElements === 1 ? '' : 's'}`}
        </h3>
        <button onClick={loadData} className="btn-outline" style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <ItemList 
        items={pagedData.content} 
        loading={loading}
        error={error}
        onRetry={loadData}
        emptyMessage={
          isFiltering ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                No lost items matched your current search filters.
              </p>
              <button onClick={handleClearFilters} className="btn-primary">
                Clear Filters
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                No lost items are currently registered in the database.
              </p>
              <Link to="/report-lost" className="btn-danger">
                <PlusCircle size={16} /> Report a Lost Item
              </Link>
            </div>
          )
        }
      />

      {!loading && !error && pagedData.totalElements > 0 && (
        <Pagination
          pageNumber={pagedData.pageNumber}
          pageSize={pagedData.pageSize}
          totalElements={pagedData.totalElements}
          totalPages={pagedData.totalPages}
          isLast={pagedData.last}
          onPageChange={(newPage) => setPage(newPage)}
          onPageSizeChange={(newSize) => { setSize(newSize); setPage(0); }}
        />
      )}
    </div>
  );
}
