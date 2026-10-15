import React from 'react';
import { Link } from 'react-router-dom';
import { Search, PlusCircle, CheckCircle, ShieldAlert, ArrowRight, FileText, CheckCircle2, HeartHandshake } from 'lucide-react';
import ItemList from '../components/ItemList';

export default function HomePage({ items = [], loading = false, error = null, onRefresh = null }) {
  const lostCount = items.filter(i => i.type === 'LOST').length;
  const foundCount = items.filter(i => i.type === 'FOUND').length;
  const recentItems = items.slice(0, 6);

  return (
    <div>
      {/* Hero Banner */}
      <section style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #2563eb 100%)',
        color: '#ffffff',
        padding: '4rem 2rem',
        borderRadius: 'var(--radius-lg)',
        marginBottom: '3rem',
        textAlign: 'center',
        boxShadow: 'var(--shadow-md)'
      }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem', lineHeight: 1.2 }}>
          Campus Lost & Found Portal
        </h1>
        <p style={{ fontSize: '1.15rem', maxWidth: '650px', margin: '0 auto 2rem', opacity: 0.9 }}>
          Lost an essential item on campus or found someone else's belongings? Report it here to quickly match and recover misplaced items.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <Link to="/report-lost" className="btn-primary" style={{ backgroundColor: '#ffffff', color: '#1e3a8a', padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
            <ShieldAlert size={18} /> I Lost Something
          </Link>
          <Link to="/report-found" className="btn-primary" style={{ backgroundColor: '#10b981', color: '#ffffff', padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
            <CheckCircle size={18} /> I Found Something
          </Link>
          <Link to="/dashboard" className="btn-outline" style={{ borderColor: 'rgba(255,255,255,0.7)', color: '#ffffff', padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
            <Search size={18} /> Browse Registry
          </Link>
        </div>
      </section>

      {/* Quick Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon-red">
            <ShieldAlert size={26} />
          </div>
          <div>
            <div className="stat-number">{lostCount}</div>
            <div className="stat-label">Active Lost Reports</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-green">
            <CheckCircle size={26} />
          </div>
          <div>
            <div className="stat-number">{foundCount}</div>
            <div className="stat-label">Reported Found Items</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-blue">
            <HeartHandshake size={26} />
          </div>
          <div>
            <div className="stat-number">94%</div>
            <div className="stat-label">Reunion Success Rate</div>
          </div>
        </div>
      </div>

      {/* How it Works */}
      <section style={{ marginBottom: '3.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 700 }}>How the Campus Registry Works</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Three simple steps to recover or return misplaced items safely</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
          <div style={{ background: '#fff', padding: '1.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ width: 44, height: 44, background: '#eff6ff', color: '#2563eb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontWeight: 700 }}>1</div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Log the Report</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Submit a quick report detailing what was lost or found with campus location and identifying characteristics.
            </p>
          </div>

          <div style={{ background: '#fff', padding: '1.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ width: 44, height: 44, background: '#eff6ff', color: '#2563eb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontWeight: 700 }}>2</div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Search & Match</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Filter by campus block, date, or category to find potential matching items logged by fellow students or security.
            </p>
          </div>

          <div style={{ background: '#fff', padding: '1.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ width: 44, height: 44, background: '#eff6ff', color: '#2563eb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontWeight: 700 }}>3</div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Verify & Claim</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Provide ownership proof at the Campus Security Hub or connect directly with the finder to retrieve your belongings.
            </p>
          </div>
        </div>
      </section>

      {/* Recent Items Grid */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Recent Campus Reports</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Latest items reported across campus buildings</p>
          </div>
          <Link to="/dashboard" className="btn-outline">
            View All Reports <ArrowRight size={15} />
          </Link>
        </div>

        <ItemList 
          items={recentItems} 
          loading={loading} 
          error={error} 
          onRetry={onRefresh} 
          emptyMessage="No campus reports recorded yet. Misplaced or found something? Use the buttons above to submit a report!"
        />
      </section>
    </div>
  );
}
