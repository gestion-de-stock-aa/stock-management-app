import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import StaffPage from './pages/StaffPage';
import RegisterPage from './pages/RegisterPage';
import TakenReport from './pages/TakenReport';

function PrivateRoute({ children, roles }) {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) return <Navigate to="/" replace />;
  if (roles && !roles.includes(role)) return <Navigate to="/" replace />;

  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/admin" element={<PrivateRoute roles={['admin']}><AdminDashboard /></PrivateRoute>} />
        <Route path="/staff" element={<PrivateRoute roles={['staff']}><StaffPage /></PrivateRoute>} />
        <Route path="/taken-report" element={<PrivateRoute roles={['admin', 'staff']}><TakenReport /></PrivateRoute>} />
        <Route path="/register" element={<PrivateRoute roles={['admin']}><RegisterPage /></PrivateRoute>} />
      </Routes>
    </Router>
  );
}

export default App;
