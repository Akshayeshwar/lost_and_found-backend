import React, { useState, useEffect } from 'react';
import { CATEGORIES } from '../data/mockData';
import { X, Save, AlertCircle, Loader2 } from 'lucide-react';

export default function EditItemModal({
  isOpen,
  item,
  onSave,
  onClose
}) {
  const [formData, setFormData] = useState({
    title: '',
    category: 'OTHER',
    type: 'LOST',
    status: 'OPEN',
    location: '',
    reportDate: '',
    description: '',
    imageUrl: ''
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (item) {
      setFormData({
        title: item.title || '',
        category: item.category || 'OTHER',
        type: item.type || 'LOST',
        status: item.status || 'OPEN',
        location: item.location || '',
        reportDate: item.reportDate || '',
        description: item.description || '',
        imageUrl: item.imageUrl || ''
      });
      setFieldErrors({});
      setError('');
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: null }));
    }
    if (error) {
      setError('');
    }
  };

  const validateInputs = () => {
    const errors = {};
    const today = new Date().toISOString().split('T')[0];

    if (!formData.title || !formData.title.trim()) {
      errors.title = 'Title is required';
    } else if (formData.title.trim().length < 2 || formData.title.trim().length > 150) {
      errors.title = 'Title must be between 2 and 150 characters';
    }

    if (!formData.category || !formData.category.trim()) {
      errors.category = 'Category is required';
    }

    if (!formData.location || !formData.location.trim()) {
      errors.location = 'Campus location is required';
    } else if (formData.location.trim().length < 2 || formData.location.trim().length > 150) {
      errors.location = 'Location must be between 2 and 150 characters';
    }

    if (!formData.reportDate) {
      errors.reportDate = 'Report date is required';
    } else if (formData.reportDate > today) {
      errors.reportDate = 'Report date cannot be in the future';
    }

    if (!formData.description || !formData.description.trim()) {
      errors.description = 'Description is required';
    } else if (formData.description.trim().length < 5 || formData.description.trim().length > 2000) {
      errors.description = 'Description must be between 5 and 2000 characters';
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return; // Prevent duplicate submissions

    const clientErrors = validateInputs();
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      setError('Please resolve the highlighted field issues before saving.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setFieldErrors({});
      await onSave(item.id, formData);
      onClose();
    } catch (err) {
      console.error('Failed to update report:', err);
      if (err.fieldErrors && typeof err.fieldErrors === 'object') {
        setFieldErrors(err.fieldErrors);
      }
      setError(err.message || 'Failed to update report.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.55)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      zIndex: 1000,
      overflowY: 'auto'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: 'var(--radius-lg)',
        padding: '2rem',
        maxWidth: 580,
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Edit Report #{item.id}
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Update report details stored in MySQL database
            </span>
          </div>

          <button
            onClick={onClose}
            className="btn-outline"
            style={{ padding: '0.35rem 0.5rem', border: 'none', color: 'var(--text-muted)' }}
            disabled={saving}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="alert-box alert-box-error">
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Title Field */}
          <div className="form-group">
            <label className="form-label" htmlFor="edit-title">Item Title *</label>
            <input
              id="edit-title"
              type="text"
              name="title"
              className={`form-control ${fieldErrors.title ? 'is-invalid' : ''}`}
              value={formData.title}
              onChange={handleChange}
              required
              disabled={saving}
            />
            {fieldErrors.title && <span className="field-error">{fieldErrors.title}</span>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="edit-type">Report Type *</label>
              <select
                id="edit-type"
                name="type"
                className={`form-control ${fieldErrors.type ? 'is-invalid' : ''}`}
                value={formData.type}
                onChange={handleChange}
                disabled={saving}
              >
                <option value="LOST">LOST</option>
                <option value="FOUND">FOUND</option>
              </select>
              {fieldErrors.type && <span className="field-error">{fieldErrors.type}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="edit-category">Category *</label>
              <select
                id="edit-category"
                name="category"
                className={`form-control ${fieldErrors.category ? 'is-invalid' : ''}`}
                value={formData.category}
                onChange={handleChange}
                disabled={saving}
              >
                {CATEGORIES.filter(c => c.value !== 'ALL').map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              {fieldErrors.category && <span className="field-error">{fieldErrors.category}</span>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="edit-location">Campus Location *</label>
              <input
                id="edit-location"
                type="text"
                name="location"
                className={`form-control ${fieldErrors.location ? 'is-invalid' : ''}`}
                value={formData.location}
                onChange={handleChange}
                required
                disabled={saving}
              />
              {fieldErrors.location && <span className="field-error">{fieldErrors.location}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="edit-date">Incident Date *</label>
              <input
                id="edit-date"
                type="date"
                name="reportDate"
                max={new Date().toISOString().split('T')[0]}
                className={`form-control ${fieldErrors.reportDate ? 'is-invalid' : ''}`}
                value={formData.reportDate}
                onChange={handleChange}
                required
                disabled={saving}
              />
              {fieldErrors.reportDate && <span className="field-error">{fieldErrors.reportDate}</span>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="edit-desc">Detailed Description *</label>
            <textarea
              id="edit-desc"
              name="description"
              className={`form-control ${fieldErrors.description ? 'is-invalid' : ''}`}
              rows={4}
              value={formData.description}
              onChange={handleChange}
              required
              disabled={saving}
            />
            {fieldErrors.description && <span className="field-error">{fieldErrors.description}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="edit-image">Image URL (Optional)</label>
            <input
              id="edit-image"
              type="url"
              name="imageUrl"
              className={`form-control ${fieldErrors.imageUrl ? 'is-invalid' : ''}`}
              value={formData.imageUrl}
              onChange={handleChange}
              disabled={saving}
            />
            {fieldErrors.imageUrl && <span className="field-error">{fieldErrors.imageUrl}</span>}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn-outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="spin-animate" /> Saving Changes...
                </>
              ) : (
                <>
                  <Save size={16} /> Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
