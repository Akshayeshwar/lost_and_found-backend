import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Percent, MapPin, Calendar, Tag, ArrowRight, HelpCircle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { fetchSuggestedMatches } from '../services/api';

export default function SuggestedMatches({ itemId, itemType }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadMatches() {
      if (!itemId) return;
      try {
        setLoading(true);
        setError(null);
        const data = await fetchSuggestedMatches(itemId);
        if (isMounted) {
          setMatches(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Failed to load suggested matches:', err);
        if (isMounted) {
          setError(err.message || 'Could not load potential matches.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadMatches();
    return () => {
      isMounted = false;
    };
  }, [itemId]);

  const oppositeLabel = itemType === 'LOST' ? 'Found Items' : 'Lost Items';

  return (
    <div className="card" style={{ marginTop: '2rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ 
            backgroundColor: '#e0f2fe', 
            color: '#0284c7', 
            padding: '0.5rem', 
            borderRadius: '0.5rem', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <Sparkles size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#0f172a' }}>
              Smart Match Suggestions ({oppositeLabel})
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.875rem', color: '#64748b' }}>
              Potential matches based on keyword, category, and location overlap.
            </p>
          </div>
        </div>
        {matches.length > 0 && (
          <span style={{ 
            fontSize: '0.8125rem', 
            fontWeight: 600, 
            backgroundColor: '#f8fafc', 
            border: '1px solid #e2e8f0', 
            padding: '0.3rem 0.75rem', 
            borderRadius: '9999px',
            color: '#334155'
          }}>
            {matches.length} candidate{matches.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748b' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem auto' }} />
          <p style={{ margin: 0, fontSize: '0.95rem' }}>Analyzing campus reports for potential matches...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#fef2f2', 
          border: '1px solid #fecaca', 
          borderRadius: '0.5rem', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.75rem', 
          color: '#991b1b' 
        }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && matches.length === 0 && (
        <div style={{ 
          padding: '2rem 1rem', 
          textAlign: 'center', 
          backgroundColor: '#f8fafc', 
          borderRadius: '0.5rem', 
          border: '1px dashed #cbd5e1' 
        }}>
          <HelpCircle size={32} style={{ color: '#94a3b8', margin: '0 auto 0.75rem auto' }} />
          <h4 style={{ margin: '0 0 0.25rem 0', color: '#334155', fontSize: '1rem' }}>No Potential Matches Found Yet</h4>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem', maxWidth: '450px', marginLeft: 'auto', marginRight: 'auto' }}>
            We could not find any active {oppositeLabel.toLowerCase()} matching this item's title, category, or location. We will continue checking as students submit new reports.
          </p>
        </div>
      )}

      {/* Matches List */}
      {!loading && !error && matches.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {matches.map((match) => {
            const score = match.matchScore || 0;
            const isHigh = score >= 70;
            const isMed = score >= 40 && score < 70;

            const badgeBg = isHigh ? '#dcfce7' : isMed ? '#e0f2fe' : '#fef3c7';
            const badgeText = isHigh ? '#166534' : isMed ? '#0369a1' : '#92400e';
            const badgeBorder = isHigh ? '#bbf7d0' : isMed ? '#bae6fd' : '#fde68a';

            return (
              <div 
                key={match.item.id} 
                style={{ 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '0.5rem', 
                  padding: '1rem', 
                  backgroundColor: '#ffffff',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ flex: 1, minWidth: '260px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.25rem', 
                        fontSize: '0.8125rem', 
                        fontWeight: 700, 
                        backgroundColor: badgeBg, 
                        color: badgeText, 
                        border: `1px solid ${badgeBorder}`,
                        padding: '0.2rem 0.6rem', 
                        borderRadius: '9999px' 
                      }}>
                        <Percent size={13} />
                        {score}% Match • {match.confidenceLabel}
                      </span>
                      <span className={`badge badge-${match.item.type.toLowerCase()}`}>
                        {match.item.type}
                      </span>
                    </div>

                    <h4 style={{ margin: '0.25rem 0', fontSize: '1.1rem', color: '#0f172a' }}>
                      {match.item.title}
                    </h4>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8125rem', color: '#64748b', marginTop: '0.35rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Tag size={14} /> {match.item.category}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <MapPin size={14} /> {match.item.location}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Calendar size={14} /> {match.item.reportDate}
                      </span>
                    </div>
                  </div>

                  <Link 
                    to={`/items/${match.item.id}`} 
                    className="btn btn-secondary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', alignSelf: 'center', fontSize: '0.875rem' }}
                  >
                    View Report <ArrowRight size={15} />
                  </Link>
                </div>

                {/* Explanation of Why It Matches */}
                <div style={{ 
                  marginTop: '0.85rem', 
                  padding: '0.75rem', 
                  backgroundColor: '#f8fafc', 
                  borderRadius: '0.375rem', 
                  borderLeft: `3px solid ${badgeText}` 
                }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <CheckCircle2 size={14} style={{ color: badgeText }} /> Why this might match:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8125rem', color: '#475569' }}>
                    {match.matchReasons && match.matchReasons.length > 0 ? (
                      match.matchReasons.map((reason, idx) => (
                        <li key={idx} style={{ marginTop: '0.15rem' }}>{reason}</li>
                      ))
                    ) : (
                      <li>{match.explanation || 'General keyword and category similarity.'}</li>
                    )}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Non-Claim Disclaimer */}
      <div style={{ 
        marginTop: '1.25rem', 
        paddingTop: '0.75rem', 
        borderTop: '1px solid #f1f5f9', 
        fontSize: '0.75rem', 
        color: '#94a3b8', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.4rem' 
      }}>
        <AlertCircle size={14} />
        <span>
          <strong>Important:</strong> Match suggestions are based on heuristic keyword comparisons and do not confirm that items are definitely identical. Always verify proof of ownership.
        </span>
      </div>
    </div>
  );
}
