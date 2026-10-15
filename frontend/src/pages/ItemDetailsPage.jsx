import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  MapPin, Calendar, User, Tag, ArrowLeft, ShieldCheck, HelpCircle, 
  CheckCircle2, AlertTriangle, RefreshCw, Check, X, Phone, Mail, 
  Clock, MessageSquare, Sparkles
} from 'lucide-react';
import { 
  fetchItemById, 
  updateItemStatus, 
  submitClaim, 
  fetchItemClaims, 
  approveClaim, 
  rejectClaim 
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingIndicator from '../components/LoadingIndicator';
import SuggestedMatches from '../components/SuggestedMatches';

export default function ItemDetailsPage({ items = [] }) {
  const { id } = useParams();
  const { user: currentUser } = useAuth();

  const [item, setItem] = useState(() => items.find(i => String(i.id) === String(id)) || null);
  const [loading, setLoading] = useState(!item);
  const [error, setError] = useState(null);

  // Claims for report owner
  const [claims, setClaims] = useState([]);
  const [loadingClaims, setLoadingClaims] = useState(false);
  const [claimActionLoading, setClaimActionLoading] = useState(false);

  // Status update state
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Claim submission modal state (for students/visitors)
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimName, setClaimName] = useState('');
  const [claimContact, setClaimContact] = useState('');
  const [claimMessage, setClaimMessage] = useState('');
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [claimSubmitted, setClaimSubmitted] = useState(false);
  const [claimError, setClaimError] = useState(null);

  // Load item details
  const loadItem = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchItemById(id);
      setItem(data);
    } catch (err) {
      console.error('Failed to load item:', err);
      setError(err.message || 'Report not found or server is unreachable.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadItem();
  }, [loadItem]);

  // Determine if current user is owner or admin
  const isOwner = Boolean(
    currentUser && (
      currentUser.role === 'ROLE_ADMIN' ||
      (item?.user && (
        item.user.id === currentUser.id ||
        (item.user.email && currentUser.email && item.user.email.toLowerCase() === currentUser.email.toLowerCase())
      ))
    )
  );

  // Load claims if owner
  const loadClaims = useCallback(async () => {
    if (!item?.id || !isOwner) return;
    try {
      setLoadingClaims(true);
      const claimsList = await fetchItemClaims(item.id);
      setClaims(claimsList);
    } catch (err) {
      console.warn('Could not load claims:', err.message);
    } finally {
      setLoadingClaims(false);
    }
  }, [item?.id, isOwner]);

  useEffect(() => {
    if (isOwner && item?.id) {
      loadClaims();
    }
  }, [isOwner, item?.id, loadClaims]);

  // Prefill claim form from current logged-in user if available
  useEffect(() => {
    if (currentUser) {
      if (!claimName) setClaimName(currentUser.name || '');
      if (!claimContact) setClaimContact(currentUser.email || '');
    }
  }, [currentUser]);

  // Handle Mark as Returned or Status change
  const handleStatusChange = async (targetStatus) => {
    if (!item) return;
    try {
      setStatusUpdating(true);
      setStatusMessage(null);
      const updated = await updateItemStatus(item.id, targetStatus);
      setItem(updated);
      setStatusMessage({
        type: 'success',
        text: `Item status successfully updated to ${targetStatus}!`
      });
      // Refresh claims list if open
      if (isOwner) {
        loadClaims();
      }
    } catch (err) {
      console.error('Status update failed:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to update item status.'
      });
    } finally {
      setStatusUpdating(false);
    }
  };

  // Handle claim submission by a student
  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    if (!claimName.trim() || !claimContact.trim() || !claimMessage.trim()) {
      setClaimError('Please provide your name, contact details, and identifying information.');
      return;
    }

    try {
      setClaimSubmitting(true);
      setClaimError(null);
      await submitClaim(item.id, {
        claimantName: claimName,
        claimantContact: claimContact,
        message: claimMessage
      });
      setClaimSubmitted(true);
    } catch (err) {
      console.error('Claim submission failed:', err);
      setClaimError(err.message || 'Failed to submit claim request.');
    } finally {
      setClaimSubmitting(false);
    }
  };

  // Handle Approve claim
  const handleApproveClaim = async (claimId) => {
    try {
      setClaimActionLoading(true);
      await approveClaim(item.id, claimId);
      // Reload item and claims
      await loadItem();
      await loadClaims();
      setStatusMessage({
        type: 'success',
        text: 'Claim approved! Item status automatically marked as CLAIMED.'
      });
    } catch (err) {
      alert('Failed to approve claim: ' + err.message);
    } finally {
      setClaimActionLoading(false);
    }
  };

  // Handle Reject claim
  const handleRejectClaim = async (claimId) => {
    try {
      setClaimActionLoading(true);
      await rejectClaim(item.id, claimId);
      await loadClaims();
    } catch (err) {
      alert('Failed to reject claim: ' + err.message);
    } finally {
      setClaimActionLoading(false);
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
    return <LoadingIndicator message={`Loading report #${id} from database...`} />;
  }

  if (error || !item) {
    return (
      <div className="empty-state" style={{ margin: '3rem auto', maxWidth: 500, borderColor: '#fecaca', background: '#fef2f2' }}>
        <AlertTriangle size={48} color="var(--lost-color)" />
        <h2 style={{ color: '#991b1b', marginTop: '0.5rem' }}>Report Not Found</h2>
        <p style={{ color: '#7f1d1d', margin: '0.5rem 0 1.25rem' }}>
          {error || 'The report you are looking for does not exist in the database or may have been deleted.'}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button onClick={loadItem} className="btn-outline">
            <RefreshCw size={15} /> Retry
          </button>
          <Link to="/dashboard" className="btn-primary">
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isLost = item.type === 'LOST';
  const isReturned = item.status === 'RETURNED';

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <Link to="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
        <ArrowLeft size={16} /> Back to All Reports
      </Link>

      {/* Returned Announcement Banner */}
      {isReturned && (
        <div style={{
          background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
          border: '1px solid #a7f3d0',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          color: '#065f46',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <Sparkles size={28} color="#059669" />
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#065f46' }}>
              Successfully Returned & Case Closed
            </h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: '#047857' }}>
              This item has been officially confirmed as returned to its rightful owner. No further claims are being accepted.
            </p>
          </div>
        </div>
      )}

      {statusMessage && (
        <div style={{
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.25rem',
          fontSize: '0.9rem',
          background: statusMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${statusMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          color: statusMessage.type === 'success' ? '#166534' : '#991b1b'
        }}>
          {statusMessage.text}
        </div>
      )}

      {/* Main Item Card */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '2rem', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className={`badge ${isLost ? 'badge-lost' : 'badge-found'}`} style={{ fontSize: '0.85rem', padding: '0.35rem 0.85rem' }}>
              {item.type}
            </span>
            <span className="badge badge-category" style={{ fontSize: '0.85rem', padding: '0.35rem 0.85rem' }}>
              <Tag size={14} /> {item.category || "OTHER"}
            </span>
            <span className={`badge ${getStatusBadgeClass(item.status)}`} style={{ fontSize: '0.85rem', padding: '0.35rem 0.85rem' }}>
              STATUS: {item.status || "OPEN"}
            </span>
            {item.claimCount > 0 && (
              <span className="badge" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                <MessageSquare size={13} /> {item.claimCount} {item.claimCount === 1 ? 'Claim' : 'Claims'}
              </span>
            )}
          </div>

          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Database Report ID: #{item.id}</span>
        </div>

        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-primary)' }}>
          {item.title}
        </h1>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', padding: '1rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <MapPin size={14} /> Campus Location
            </div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.location}</div>
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Calendar size={14} /> Incident / Report Date
            </div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.reportDate}</div>
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <User size={14} /> Reported By
            </div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
              {item.user ? `${item.user.name} (${item.user.email})` : "Campus Community Member"}
            </div>
          </div>
        </div>

        {item.imageUrl && (
          <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            <img 
              src={item.imageUrl} 
              alt={item.title} 
              style={{ maxHeight: 320, maxWidth: '100%', borderRadius: 'var(--radius-md)', objectFit: 'cover' }} 
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        )}

        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Detailed Description</h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
            {item.description}
          </p>
        </div>

        {/* Action bar for report visitors / claimants */}
        {!isOwner && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              <ShieldCheck size={20} color="var(--primary)" />
              <span>Contact the report owner or submit a claim request to verify identity.</span>
            </div>

            {isReturned ? (
              <span className="badge badge-returned" style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
                <CheckCircle2 size={16} /> Item Already Returned
              </span>
            ) : (
              <button 
                className="btn-primary"
                onClick={() => setClaimOpen(true)}
              >
                <HelpCircle size={16} /> {isLost ? "I Found This Item / Contact Owner" : "Claim This Item"}
              </button>
            )}
          </div>
        )}

        {/* Owner Controls Section */}
        {isOwner && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Report Management
                </span>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  Current Status: <strong style={{ color: isReturned ? '#047857' : 'var(--primary)' }}>{item.status}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {!isReturned ? (
                  <>
                    {item.status === 'CLAIMED' && (
                      <button
                        type="button"
                        className="btn-outline"
                        style={{ fontSize: '0.85rem' }}
                        disabled={statusUpdating}
                        onClick={() => handleStatusChange('OPEN')}
                      >
                        Revert to OPEN
                      </button>
                    )}
                    {item.status === 'OPEN' && (
                      <button
                        type="button"
                        className="btn-outline"
                        style={{ fontSize: '0.85rem' }}
                        disabled={statusUpdating}
                        onClick={() => handleStatusChange('CLAIMED')}
                      >
                        Mark as CLAIMED
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ background: '#047857', borderColor: '#047857', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                      disabled={statusUpdating}
                      onClick={() => handleStatusChange('RETURNED')}
                    >
                      <CheckCircle2 size={16} /> Mark as RETURNED
                    </button>
                  </>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#047857', fontWeight: 600, fontSize: '0.9rem' }}>
                    <CheckCircle2 size={18} /> Finalized & Case Closed
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Received Claims Management (Only for verified Owner / Admin) */}
      {isOwner && (
        <div style={{ marginTop: '2rem', background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '2rem', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Received Claims & Inquiries ({claims.length})
              </h2>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Contact information submitted by students claiming this item. Visible only to you as the report owner.
              </p>
            </div>
            <button onClick={loadClaims} className="btn-outline" style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}>
              <RefreshCw size={13} /> Refresh Claims
            </button>
          </div>

          {loadingClaims ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              Loading claims...
            </div>
          ) : claims.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)' }}>
              <MessageSquare size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
              <h4 style={{ margin: 0, color: 'var(--text-secondary)' }}>No Claims Received Yet</h4>
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                When students express interest or submit proof for this item, their contact details will be listed here.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {claims.map((claim) => (
                <div 
                  key={claim.id}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    background: claim.status === 'APPROVED' ? '#f0fdf4' : claim.status === 'REJECTED' ? '#fef2f2' : '#ffffff',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                        {claim.claimantName}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Phone size={13} color="var(--primary)" /> {claim.claimantContact}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)' }}>
                          <Clock size={13} /> {claim.createdAt ? new Date(claim.createdAt).toLocaleDateString() : 'Recent'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className={`badge ${claim.status === 'APPROVED' ? 'badge-returned' : claim.status === 'REJECTED' ? 'badge-lost' : 'badge-open'}`} style={{ fontSize: '0.75rem' }}>
                        {claim.status}
                      </span>
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-main)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
                    <strong>Claimant Note / Identifying Proof:</strong>
                    <p style={{ marginTop: '0.25rem', whiteSpace: 'pre-line' }}>{claim.message}</p>
                  </div>

                  {claim.status === 'PENDING' && (
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="btn-outline"
                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', color: '#dc2626', borderColor: '#fca5a5' }}
                        disabled={claimActionLoading}
                        onClick={() => handleRejectClaim(claim.id)}
                      >
                        <X size={14} /> Reject Claim
                      </button>
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', background: '#047857', borderColor: '#047857' }}
                        disabled={claimActionLoading}
                        onClick={() => handleApproveClaim(claim.id)}
                      >
                        <Check size={14} /> Approve & Mark Claimed
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Smart Match Suggestions (LOST vs FOUND) */}
      {item && <SuggestedMatches itemId={item.id} itemType={item.type} />}

      {/* Claim Submission Modal for Visitors / Students */}
      {claimOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          zIndex: 100
        }}>
          <div style={{ background: '#fff', borderRadius: 'var(--radius-lg)', padding: '2rem', maxWidth: 520, width: '100%', boxShadow: 'var(--shadow-lg)' }}>
            {claimSubmitted ? (
              <div style={{ textAlign: 'center' }}>
                <CheckCircle2 size={48} color="#059669" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem' }}>Interest / Claim Submitted!</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.75rem 0 1.5rem', lineHeight: 1.6 }}>
                  Your contact details and verification information have been securely forwarded to the report owner. They will review your details and reach out to coordinate the return.
                </p>
                <button 
                  className="btn-primary" 
                  onClick={() => { 
                    setClaimOpen(false); 
                    setClaimSubmitted(false); 
                    setClaimMessage('');
                    loadItem();
                  }}
                >
                  Done
                </button>
              </div>
            ) : (
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  {isLost ? "Contact Owner Regarding Found Item" : "Submit Claim for This Item"}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                  Provide your contact information and identifying details to verify your connection to this item.
                </p>

                {claimError && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    {claimError}
                  </div>
                )}

                <form onSubmit={handleClaimSubmit}>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Your Full Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. John Doe"
                      value={claimName}
                      onChange={(e) => setClaimName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Your Contact Info (Phone or Email)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 555-0199 or student@campus.edu"
                      value={claimContact}
                      onChange={(e) => setClaimContact(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Proof / Identifying Details</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      placeholder="Describe unique characteristics (e.g. scratches, lock screen photo, serial numbers, keychain charms, contents)..."
                      value={claimMessage}
                      onChange={(e) => setClaimMessage(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-sm)', padding: '0.75rem', marginBottom: '1.25rem', fontSize: '0.785rem', color: 'var(--text-secondary)' }}>
                    🔒 <strong>Privacy Notice:</strong> By submitting, you agree to share this contact information with the report owner and authorized campus administrators solely for item verification and safe return.
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button 
                      type="button" 
                      className="btn-outline" 
                      onClick={() => { setClaimOpen(false); setClaimError(null); }}
                      disabled={claimSubmitting}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="btn-primary"
                      disabled={claimSubmitting}
                    >
                      {claimSubmitting ? 'Submitting...' : 'Submit Claim Request'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
