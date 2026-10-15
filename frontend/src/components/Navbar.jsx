import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Compass, Search, PlusCircle, CheckCircle, User, LogIn, Menu, X, ShieldAlert, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handleLinkClick = () => setMobileOpen(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileOpen(false);
  };

  return (
    <header className="navbar">
      <div className={`navbar-inner ${mobileOpen ? 'mobile-nav-open' : ''}`}>
        <Link to="/" className="brand-logo" onClick={handleLinkClick}>
          <Compass size={28} />
          <span>Campus Lost & Found</span>
        </Link>

        <button 
          className="mobile-menu-btn" 
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <nav className="nav-links">
          <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={handleLinkClick}>
            Home
          </NavLink>
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={handleLinkClick}>
            Dashboard
          </NavLink>
          <NavLink to="/lost" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={handleLinkClick}>
            <ShieldAlert size={16} /> Lost Items
          </NavLink>
          <NavLink to="/found" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={handleLinkClick}>
            <CheckCircle size={16} /> Found Items
          </NavLink>
          <NavLink to="/report-lost" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={handleLinkClick}>
            <PlusCircle size={16} /> Report Lost
          </NavLink>
          <NavLink to="/report-found" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={handleLinkClick}>
            <PlusCircle size={16} /> Report Found
          </NavLink>
          <NavLink to="/my-reports" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={handleLinkClick}>
            My Reports
          </NavLink>
        </nav>

        <div className="nav-auth">
          {isAuthenticated && user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ textAlign: 'right' }}>
                <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {user.name}
                </span>
                <span style={{ display: 'block', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                  {user.role === 'ROLE_STAFF' ? 'Staff' : 'Student'}
                </span>
              </div>
              <button 
                onClick={handleLogout} 
                className="btn-outline"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                title="Sign out of campus account"
              >
                <LogOut size={14} /> Logout
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Link to="/login" className="btn-outline" onClick={handleLinkClick} style={{ padding: '0.4rem 0.85rem' }}>
                <LogIn size={15} /> Login
              </Link>
              <Link to="/register" className="btn-primary" onClick={handleLinkClick} style={{ padding: '0.4rem 0.85rem' }}>
                <User size={15} /> Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
