// path: src/AppRouter.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Dashboard from './pages/admin/Dashboard';
import Patients from './pages/admin/Patients';
import Incidents from './pages/admin/Incidents';
import CalendarView from './pages/admin/CalendarView';
import InventoryRouter from './pages/admin/inventory/InventoryRouter';

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>

        {/* Login */}
        <Route path="/login" element={<Login />} />

        {/* Dashboard = homepage */}
        <Route
          path="/"
          element={
            <ProtectedRoute allowedRoles={['admin', 'developers', 'telesale', 'assistant', 'receptionist']}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/patients"
          element={
            <ProtectedRoute allowedRoles={['admin', 'developers', 'telesale', 'receptionist']}>
              <Patients />
            </ProtectedRoute>
          }
        />

        <Route
          path="/patient/:patientId/incidents"
          element={
            <ProtectedRoute allowedRoles={['admin', 'developers', 'telesale', 'receptionist']}>
              <Incidents />
            </ProtectedRoute>
          }
        />

        <Route
          path="/calendar"
          element={
            <ProtectedRoute allowedRoles={['admin', 'developers', 'telesale', 'receptionist']}>
              <CalendarView />
            </ProtectedRoute>
          }
        />

        <Route
          path="/inventory/*"
          element={
            <ProtectedRoute allowedRoles={['admin', 'developers', 'assistant']}>
              <InventoryRouter />
            </ProtectedRoute>
          }
        />

      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;