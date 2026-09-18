// path: src/AppRouter.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Dashboard from './pages/admin/Dashboard';
import Patients from './pages/admin/Patients';
import Incidents from './pages/admin/Treatments';
import CalendarView from './pages/admin/CalendarView';
import InventoryRouter from './pages/admin/inventory/InventoryRouter';
import InvoicePage from './pages/admin/invoice/InvoicePage';
import Telesales from './pages/admin/Telesales';

const STAFF_ROLES = ['admin', 'developers', 'telesale', 'assistant', 'receptionist'];
const PATIENT_ROLES = ['admin', 'developers', 'telesale', 'receptionist'];

const AppRouter = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><Dashboard /></ProtectedRoute>} />
      <Route path="/patients" element={<ProtectedRoute allowedRoles={PATIENT_ROLES}><Patients /></ProtectedRoute>} />
      <Route path="/patient/:patientId/incidents" element={<ProtectedRoute allowedRoles={PATIENT_ROLES}><Incidents /></ProtectedRoute>} />
      <Route path="/patient/:patientId/invoices" element={<ProtectedRoute allowedRoles={PATIENT_ROLES}><InvoicePage /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute allowedRoles={PATIENT_ROLES}><CalendarView /></ProtectedRoute>} />
      <Route path="/inventory/*" element={<ProtectedRoute allowedRoles={['admin', 'developers', 'assistant']}><InventoryRouter /></ProtectedRoute>} />
      <Route path="/telesales" element={<ProtectedRoute allowedRoles={['admin', 'developers']}><Telesales /></ProtectedRoute>} />
    </Routes>
  </BrowserRouter>
);

export default AppRouter;
