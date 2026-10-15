import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Package, PlusCircle, CheckCircle2, Trash2, Edit3, ArrowRight, AlertTriangle, RefreshCw, Info, RotateCcw, ShieldCheck, MessageSquare } from 'lucide-react';
import LoadingIndicator from '../components/LoadingIndicator';
import EditItemModal from '../components/EditItemModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import { fetchMyReports, updateItemReport, deleteItemReport, updateItemStatus } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function MyReportsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const myReports = await fetchMyReports({ paged: false });
      setItems(myReports);
    } catch (err) {
      console.error('Failed to load my reports:', err);
      setError(err.message || 'Unable to connect to the backend server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Edit Save
  const handleSaveEdit = async (id, updatedFields) => {
    const updated = await updateItemReport(id, updatedFields);
    setItems(prev => prev.map(i => i.id === id ? updated : i));
  };

  // Handle Delete Confirm
  const handleConfirmDelete = async (id) => {
    try {
      await deleteItemReport(id);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      alert(err.message || 'Failed to delete report.');
    }
  };

  // Quick Mark as Returned (Session 10)
  const handleMarkReturned = async (item) => {
    try {
      const updated = await updateItemStatus(item.id, 'RETURNED');
      setItems(prev => prev.map(i => i.id === item.id ? updated : i));
    } catch (err) {
      alert('Failed to mark item as returned: ' + err.message);
    }
  };

  // Quick Status Toggle between OPEN and CLAIMED
  const handleToggleStatus = async (item) => {
    if (item.status === 'RETURNED' || item.status === 'CLOSED') {
      alert(`Cannot alter an item that is already in terminal state: ${item.status}`);
      return;
    }
    const newStatus = (item.status === 'CLAIMED') ? 'OPEN' : 'CLAIMED';
    try {
      const updated = await updateItemStatus(item.id, newStatus);
      setItems(prev => prev.map(i => i.id === item.id ? updated : i));
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'CLAIMED': return 'badge-claimed';
      case 'RETURNED': return 'badge-returned';
      case 'RESOLVED': return 'badge-resolved';
      case 'CLOSED': return 'badge-closed';
      default: return 'badge-open';
    }
  };

  if (loading) {
    return <LoadingIndicator message="Retrieving your campus reports..." />;
  }

  if (error) {
    return (
      <div className="empty-state" style={{ borderColor: '#fecaca', background: '#fef2f2' }}>
        <AlertTriangle size={48} color="var(--lost-color)" />
        <h3 style={{ color: '#991b1b', marginTop: '0.5rem' }}>Failed to Load Reports</h3>
        <p style={{ color: '#7f1d1d', margin: '0.5rem 0 1.25rem' }}>{error}</p>
        <button onClick={loadData} className="btn-primary" style={{ margin: '0 auto' }}>
          <RefreshCw size={15} /> Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">My Campus Reports</h1>
          <p className="page-subtitle">
            Manage your submitted lost and found reports. Securely linked and verified under your authenticated campus account.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/report-lost" className="btn-outline">
            <PlusCircle size={16} /> Report Lost
          </Link>
          <Link to="/report-found" className="btn-primary">
            <PlusCircle size={16} /> Report Found
          </Link>
        </div>
      </div>

      {/* Authenticated Account Status */}
      <div style={{
        background: '#f0fdf4',
        border: '1px solid #bbf7d0',
        borderRadius: 'var(--radius-md)',
        padding: '0.85rem 1.25rem',
        marginBottom: '1.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        fontSize: '0.875rem',
        color: '#166534'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <ShieldCheck size={20} color="#16a34a" />
          <span>Authenticated Account: <strong>{user?.name || user?.email}</strong> ({user?.role || 'ROLE_STUDENT'})</span>
        </div>
        <span style={{ fontSize: '0.8rem', background: '#dcfce7', padding: '0.2rem 0.6rem', borderRadius: 12, fontWeight: 600 }}>
          {items.length} {items.length === 1 ? 'Report' : 'Reports'}
        </span>
      </div>

      {/* Reports Listing */}
      {items.length === 0 ? (
        <div className="empty-state">
          <Package size={48} />
          <h3>No Personal Reports Found</h3>
          <p style={{ maxWidth: 450, margin: '0.5rem auto 1.5rem', color: 'var(--text-secondary)' }}>
            You haven't submitted any lost or found reports under your account yet. When you submit a report, it will appear here for you to edit, mark resolved, or delete.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <Link to="/report-lost" className="btn-danger">
              <PlusCircle size={16} /> Report Lost Item
            </Link>
            <Link to="/report-found" className="btn-primary">
              <PlusCircle size={16} /> Report Found Item
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {items.map(item => (
            <div 
              key={item.id}
              style={{
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div style={{ flex: '1 1 300px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span className={`badge ${item.type === 'LOST' ? 'badge-lost' : 'badge-found'}`}>
                    {item.type}
                  </span>
                  <span className="badge badge-category">
                    {item.category || "OTHER"}
                  </span>
                  <span className={`badge ${getStatusBadgeClass(item.status)}`}>
                    {item.status}
                  </span>
                  {item.claimCount > 0 && (
                    <Link to={`/items/${item.id}`} className="badge" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                      <MessageSquare size={12} /> {item.claimCount} {item.claimCount === 1 ? 'Claim' : 'Claims'}
                    </Link>
                  )}
                  <span style={{ fontSize: '0.785rem', color: 'var(--text-muted)' }}>
                    Report ID: #{item.id}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                  {item.title}
                </h3>
                
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Location: <strong>{item.location}</strong> &bull; Incident Date: <strong>{item.reportDate}</strong>
                </p>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                {/* Return Workflow: Mark as RETURNED */}
                {item.status !== 'RETURNED' ? (
                  <button
                    type="button"
                    className="btn-primary"
                    style={{
                      fontSize: '0.8rem',
                      padding: '0.4rem 0.65rem',
                      background: '#047857',
                      borderColor: '#047857',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                    onClick={() => handleMarkReturned(item)}
                    title="Mark item as returned to owner"
                  >
                    <CheckCircle2 size={14} /> Mark Returned
                  </button>
                ) : (
                  <span className="badge badge-returned" style={{ fontSize: '0.785rem' }}>
                    <CheckCircle2 size={13} /> Returned
                  </span>
                )}

                {/* Edit Button */}
                <button
                  type="button"
                  className="btn-outline"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.65rem', color: 'var(--primary)', borderColor: 'var(--primary)' }}
                  onClick={() => setEditingItem(item)}
                  title="Edit report details"
                >
                  <Edit3 size={14} /> Edit
                </button>

                {/* Delete Button */}
                <button
                  type="button"
                  className="btn-outline"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.65rem', color: 'var(--lost-color)', borderColor: 'var(--lost-color)' }}
                  onClick={() => setDeletingItem(item)}
                  title="Delete report permanently"
                >
                  <Trash2 size={14} /> Delete
                </button>

                {/* View Details Link */}
                <Link
                  to={`/items/${item.id}`}
                  className="btn-primary"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                >
                  View <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <EditItemModal
        isOpen={Boolean(editingItem)}
        item={editingItem}
        onSave={handleSaveEdit}
        onClose={() => setEditingItem(null)}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingItem)}
        item={deletingItem}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeletingItem(null)}
      />
    </div>
  );
}
