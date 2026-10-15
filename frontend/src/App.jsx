import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';

// Pages
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import LostItemsPage from './pages/LostItemsPage';
import FoundItemsPage from './pages/FoundItemsPage';
import ItemDetailsPage from './pages/ItemDetailsPage';
import ReportLostPage from './pages/ReportLostPage';
import ReportFoundPage from './pages/ReportFoundPage';
import MyReportsPage from './pages/MyReportsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Backend API Service
import { fetchItems, createItemReport, updateItemReport, deleteItemReport } from './services/api';

export default function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchItems({ paged: false });
      setItems(data);
    } catch (err) {
      console.error('Failed to load items from Spring Boot API:', err);
      setError(err.message || 'Unable to connect to the backend server. Please verify the Spring Boot API is running on port 8080.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleAddItem = async (itemData) => {
    const created = await createItemReport(itemData);

    // Save to local device tracking for My Reports
    try {
      const stored = localStorage.getItem('campus_my_report_ids');
      const list = stored ? JSON.parse(stored) : [];
      if (!list.includes(created.id)) {
        list.push(created.id);
        localStorage.setItem('campus_my_report_ids', JSON.stringify(list));
      }
    } catch (e) {
      console.warn('Failed to save report ID to localStorage:', e);
    }

    // Prepend newly created item from database to state
    setItems(prev => [created, ...prev]);
    return created;
  };

  return (
    <AuthProvider>
      <div className="app-container">
        <Navbar />

        <main className="main-content container">
          <ErrorBoundary>
            <Routes>
              <Route 
                path="/" 
                element={
                  <HomePage 
                    items={items} 
                    loading={loading} 
                    error={error} 
                    onRefresh={loadItems} 
                  />
                } 
              />
              <Route 
                path="/dashboard" 
                element={<DashboardPage />} 
              />
              <Route 
                path="/lost" 
                element={<LostItemsPage />} 
              />
              <Route 
                path="/found" 
                element={<FoundItemsPage />} 
              />
              <Route 
                path="/items/:id" 
                element={<ItemDetailsPage items={items} />} 
              />
              {/* Protected Reporting and Management Routes */}
              <Route 
                path="/report-lost" 
                element={
                  <ProtectedRoute>
                    <ReportLostPage onAddItem={handleAddItem} />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/report-found" 
                element={
                  <ProtectedRoute>
                    <ReportFoundPage onAddItem={handleAddItem} />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/my-reports" 
                element={
                  <ProtectedRoute>
                    <MyReportsPage />
                  </ProtectedRoute>
                } 
              />
              {/* Auth Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundary>
        </main>

        <Footer />
      </div>
    </AuthProvider>
  );
}
