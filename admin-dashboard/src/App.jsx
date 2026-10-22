import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import IngredientsPage from './pages/IngredientsPage';
import MenuPage from './pages/MenuPage';
import OrdersPage from './pages/OrdersPage';
import FinancialPage from './pages/FinancialPage';
import RankingPage from './pages/RankingPage';
import ExpensesPage from './pages/ExpensesPage';
import UsersPage from './pages/UsersPage';

function ProtectedRoute({ children }) {
  const { token, user } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="ingredients" element={<IngredientsPage />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="financial" element={<FinancialPage />} />
          <Route path="ranking" element={<RankingPage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="users" element={<UsersPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
