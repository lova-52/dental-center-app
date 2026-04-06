//path: src/AppRouter.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import AdminDashboard from './pages/admin/Dashboard';
import Patients from './pages/admin/Patients';
import Incidents from './pages/admin/Incidents';
import CalendarView from './pages/admin/CalendarView';
import InventoryRouter from './pages/admin/inventory/InventoryRouter';

import PatientDashboard from './pages/patient/Dashboard';
import Profile from './pages/patient/Profile'; // ✅ Add this line

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />

        {/* Admin Routes */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/patients" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Patients />
          </ProtectedRoute>
        } />
        <Route path="/admin/patient/:patientId/incidents" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Incidents />
          </ProtectedRoute>
        } />
        <Route path="/admin/calendar" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <CalendarView />
          </ProtectedRoute>
        } />
        <Route path="/admin/inventory/*" element={
          <ProtectedRoute allowedRoles={['admin','receptionist','telesale']}>
            <InventoryRouter />
          </ProtectedRoute>
        } />

        {/* Patient Routes */}
        <Route path="/patient/dashboard" element={
          <ProtectedRoute allowedRoles={['patient']}>
            <PatientDashboard />
          </ProtectedRoute>
        } />
        <Route path="/patient/profile" element={
          <ProtectedRoute allowedRoles={['patient']}>
            <Profile />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
