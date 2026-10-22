import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import BottomNav from './components/BottomNav';
import LoginPage from './pages/LoginPage';
import TopBar from './components/TopBar';
import POSPage from './pages/POSPage';
import PurchasesPage from './pages/PurchasesPage';
import ExpensesPage from './pages/ExpensesPage';
import NotificationsPage from './pages/NotificationsPage';
import DailySummaryPage from './pages/DailySummaryPage';

export default function App() {
  const token = localStorage.getItem('token');

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{ duration: 4000, style: { borderRadius: 10, fontSize: 14 } }}
      />
      {!token && (
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
      {token && (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
          <TopBar />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Routes>
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/" element={<POSPage />} />
              <Route path="/purchases" element={<PurchasesPage />} />
              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/summary" element={<DailySummaryPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
          <BottomNav />
        </div>
      )}
    </>
  );
}
