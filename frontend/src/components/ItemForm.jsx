import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CATEGORIES } from '../data/mockData';
import { PlusCircle, AlertCircle, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';

export default function ItemForm({ 
  initialType = 'LOST', 
  titleText = "Report an Item", 
  subtitleText = "Fill in the details to submit a report to the campus registry",
  onSubmit 
}) {
  const [formData, setFormData] = useState({
    title: '',
    category: 'ELECTRONICS',
    type: initialType,
    location: '',
    reportDate: new Date().toISOString().split('T')[0],
    description: '',
    imageUrl: ''
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [createdItem, setCreatedItem] = useState(null);
  const [generalError, setGeneralError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear field-specific error as user types
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: null }));
    }
    if (generalError) {
      setGeneralError('');
    }
  };

  const validateForm = () => {
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
    if (submitting) return; // Prevent duplicate submissions

    const clientErrors = validateForm();
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      setGeneralError('Please correct the highlighted fields before submitting.');
      return;
    }

    try {
      setSubmitting(true);
      setGeneralError('');
      setFieldErrors({});

      let result = null;
      if (onSubmit) {
        result = await onSubmit(formData);
      }
      setCreatedItem(result);
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to submit item report:', err);
      if (err.fieldErrors && typeof err.fieldErrors === 'object') {
        setFieldErrors(err.fieldErrors);
      }
      setGeneralError(err.message || 'Failed to submit report. Please check network connectivity.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="form-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
        <CheckCircle2 size={56} color="var(--found-color)" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Report Submitted Successfully!</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.75rem', lineHeight: 1.5 }}>
          Your {formData.type} item report for "<strong>{formData.title}</strong>" has been recorded in the database.
          {createdItem?.id && (
            <span style={{ display: 'block', marginTop: '0.35rem', fontWeight: 600, color: 'var(--primary)' }}>
              Assigned Report ID: #{createdItem.id}
            </span>
          )}
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {createdItem?.id && (
            <Link to={`/items/${createdItem.id}`} className="btn-primary">
              View Report Details <ArrowRight size={16} />
            </Link>
          )}
          <Link to="/dashboard" className="btn-outline">
            Go to Dashboard
          </Link>
          <button 
            type="button"
            className="btn-outline" 
            onClick={() => {
              setFormData({
                title: '',
                category: 'ELECTRONICS',
                type: initialType,
                location: '',
                reportDate: new Date().toISOString().split('T')[0],
                description: '',
                imageUrl: ''
              });
              setFieldErrors({});
              setGeneralError('');
              setSubmitted(false);
              setCreatedItem(null);
            }}
          >
            Submit Another Report
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="form-card">
      <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{titleText}</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{subtitleText}</p>
      </div>

      {generalError && (
        <div className="alert-box alert-box-error">
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{generalError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Title Field */}
        <div className="form-group">
          <label className="form-label" htmlFor="form-title">
            Item Title / Name *
          </label>
          <input
            id="form-title"
            type="text"
            name="title"
            className={`form-control ${fieldErrors.title ? 'is-invalid' : ''}`}
            placeholder="e.g. Dell Inspiron 15 Laptop (Silver)"
            value={formData.title}
            onChange={handleChange}
            required
            disabled={submitting}
          />
          {fieldErrors.title && <span className="field-error">{fieldErrors.title}</span>}
        </div>

        {/* Type & Category Fields */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="form-type">
              Report Type *
            </label>
            <select
              id="form-type"
              name="type"
              className={`form-control ${fieldErrors.type ? 'is-invalid' : ''}`}
              value={formData.type}
              onChange={handleChange}
              disabled={submitting}
            >
              <option value="LOST">Lost Item (I misplaced something)</option>
              <option value="FOUND">Found Item (I discovered something)</option>
            </select>
            {fieldErrors.type && <span className="field-error">{fieldErrors.type}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="form-category">
              Category *
            </label>
            <select
              id="form-category"
              name="category"
              className={`form-control ${fieldErrors.category ? 'is-invalid' : ''}`}
              value={formData.category}
              onChange={handleChange}
              disabled={submitting}
            >
              {CATEGORIES.filter(c => c.value !== 'ALL').map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
            {fieldErrors.category && <span className="field-error">{fieldErrors.category}</span>}
          </div>
        </div>

        {/* Location & Report Date Fields */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="form-location">
              Campus Location *
            </label>
            <input
              id="form-location"
              type="text"
              name="location"
              className={`form-control ${fieldErrors.location ? 'is-invalid' : ''}`}
              placeholder="e.g. Main Library 2nd Floor"
              value={formData.location}
              onChange={handleChange}
              required
              disabled={submitting}
            />
            {fieldErrors.location && <span className="field-error">{fieldErrors.location}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="form-date">
              Date Reported / Incident Date *
            </label>
            <input
              id="form-date"
              type="date"
              name="reportDate"
              max={new Date().toISOString().split('T')[0]}
              className={`form-control ${fieldErrors.reportDate ? 'is-invalid' : ''}`}
              value={formData.reportDate}
              onChange={handleChange}
              required
              disabled={submitting}
            />
            {fieldErrors.reportDate && <span className="field-error">{fieldErrors.reportDate}</span>}
          </div>
        </div>

        {/* Description Field */}
        <div className="form-group">
          <label className="form-label" htmlFor="form-description">
            Detailed Description *
          </label>
          <textarea
            id="form-description"
            name="description"
            className={`form-control ${fieldErrors.description ? 'is-invalid' : ''}`}
            placeholder="Describe key identifying marks, color, brand, stickers, unique features, or contents (min 5 characters)..."
            value={formData.description}
            onChange={handleChange}
            rows={4}
            required
            disabled={submitting}
          />
          {fieldErrors.description && <span className="field-error">{fieldErrors.description}</span>}
        </div>

        {/* Image URL Field */}
        <div className="form-group">
          <label className="form-label" htmlFor="form-image">
            Image URL (Optional)
          </label>
          <input
            id="form-image"
            type="url"
            name="imageUrl"
            className={`form-control ${fieldErrors.imageUrl ? 'is-invalid' : ''}`}
            placeholder="https://example.com/item-photo.jpg"
            value={formData.imageUrl}
            onChange={handleChange}
            disabled={submitting}
          />
          {fieldErrors.imageUrl && <span className="field-error">{fieldErrors.imageUrl}</span>}
        </div>

        {/* Submit Button (Disabled while submitting to prevent duplicate requests) */}
        <button 
          type="submit" 
          className="btn-primary" 
          style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', marginTop: '0.5rem' }}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2 size={18} className="spin-animate" /> Processing Report...
            </>
          ) : (
            <>
              <PlusCircle size={18} /> Submit Report
            </>
          )}
        </button>
      </form>
    </div>
  );
}
