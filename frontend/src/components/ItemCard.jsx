import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, User, ArrowRight, Tag } from 'lucide-react';

export default function ItemCard({ item }) {
  const isLost = item.type === 'LOST';

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'CLAIMED': return 'badge-claimed';
      case 'RETURNED': return 'badge-returned';
      case 'RESOLVED': return 'badge-resolved';
      case 'CLOSED': return 'badge-closed';
      default: return 'badge-open';
    }
  };

  return (
    <div className="item-card">
      <div>
        <div className="item-card-header">
          <span className={`badge ${isLost ? 'badge-lost' : 'badge-found'}`}>
            {item.type}
          </span>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <span className="badge badge-category">
              <Tag size={12} /> {item.category || "OTHER"}
            </span>
            <span className={`badge ${getStatusBadgeClass(item.status)}`}>
              {item.status || "OPEN"}
            </span>
          </div>
        </div>

        <h3 className="item-card-title">{item.title}</h3>
        <p className="item-card-desc">{item.description}</p>

        <div className="item-card-meta">
          <div className="item-meta-row">
            <MapPin size={15} color="var(--primary)" />
            <span>{item.location}</span>
          </div>
          <div className="item-meta-row">
            <Calendar size={15} color="var(--text-muted)" />
            <span>Reported: {item.reportDate}</span>
          </div>
          {item.user && (
            <div className="item-meta-row">
              <User size={15} color="var(--text-muted)" />
              <span>By: {item.user.name}</span>
            </div>
          )}
        </div>
      </div>

      <div className="item-card-footer">
        <span style={{ fontSize: '0.785rem', color: 'var(--text-muted)' }}>
          ID #{item.id}
        </span>
        <Link to={`/items/${item.id}`} className="btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}>
          Details <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
