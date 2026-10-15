import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, ShieldAlert, CheckCircle, PackageOpen, RefreshCw, XCircle, PlusCircle } from 'lucide-react';
import ItemList from '../components/ItemList';
import Pagination from '../components/Pagination';
import { CATEGORIES } from '../data/mockData';
import { fetchItemsPaged } from '../services/api';

export default function DashboardPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
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

  // Debounce search input by 300ms to avoid excessive requests
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0); // Reset to page 0 on new search
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchItemsPaged({
        search: debouncedSearch,
        type: selectedType,
        category: selectedCategory,
        status: selectedStatus,
        page,
        size,
        sortBy,
        sortDir
      });
      setPagedData(res);
    } catch (err) {
      console.error('Error fetching dashboard reports:', err);
      setError(err.message || 'Unable to connect to the campus reports database.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedType, selectedCategory, selectedStatus, page, size, sortBy, sortDir]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setSelectedCategory('ALL');
    setSelectedType('ALL');
    setSelectedStatus('ALL');
    setSortBy('createdAt');
    setSortDir('desc');
    setPage(0);
  };

  const isFiltering = searchTerm || selectedCategory !== 'ALL' || selectedType !== 'ALL' || selectedStatus !== 'ALL';

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">Campus Lost & Found Dashboard</h1>
        <p className="page-subtitle">Search, filter, and track lost items and turned-in belongings across campus.</p>
      </div>

      {/* Filter and Search Bar */}
      <div className="filters-bar" style={{ gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search Input (Title, Description, Location) */}
        <div className="search-input-wrapper" style={{ flex: '1 1 260px' }}>
          <Search size={18} />
          <input
            type="text"
            className="search-input"
            placeholder="Search by title, description, location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0 0.5rem' }}
              title="Clear search"
            >
              <XCircle size={16} />
            </button>
          )}
        </div>

        {/* Type Filter */}
        <select
          className="select-filter"
          value={selectedType}
          onChange={(e) => { setSelectedType(e.target.value); setPage(0); }}
          style={{ flex: '0 1 140px' }}
        >
          <option value="ALL">All Types</option>
          <option value="LOST">Lost Only</option>
          <option value="FOUND">Found Only</option>
        </select>

        {/* Category Filter */}
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

        {/* Status Filter */}
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
          <option value="CLOSED">CLOSED</option>
        </select>

        {/* Sort Filter */}
        <select
          className="select-filter"
          value={`${sortBy}-${sortDir}`}
          onChange={(e) => {
            const [by, dir] = e.target.value.split('-');
            setSortBy(by);
            setSortDir(dir);
            setPage(0);
          }}
          style={{ flex: '0 1 160px' }}
        >
          <option value="createdAt-desc">Newest First</option>
          <option value="createdAt-asc">Oldest First</option>
          <option value="reportDate-desc">Recent Report Date</option>
          <option value="title-asc">Title (A-Z)</option>
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

      {/* Summary Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1.25rem 0 1rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          {loading ? 'Searching campus registry...' : `Found ${pagedData.totalElements} Matching Report${pagedData.totalElements === 1 ? '' : 's'}`}
        </h3>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={loadData}
            className="btn-outline"
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
            title="Refresh reports"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Reports Listing */}
      <ItemList
        items={pagedData.content}
        loading={loading}
        error={error}
        onRetry={loadData}
        emptyMessage={
          isFiltering ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                No reports matched your search criteria. Try modifying your search keywords or clearing active filters.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button onClick={handleClearFilters} className="btn-primary">
                  Clear All Filters
                </button>
                <Link to="/report-lost" className="btn-outline">
                  <PlusCircle size={15} /> Report New Lost Item
                </Link>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                There are no reports recorded in the database yet.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <Link to="/report-lost" className="btn-danger">
                  <PlusCircle size={15} /> Report Lost
                </Link>
                <Link to="/report-found" className="btn-primary">
                  <PlusCircle size={15} /> Report Found
                </Link>
              </div>
            </div>
          )
        }
      />

      {/* Pagination Controls */}
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
