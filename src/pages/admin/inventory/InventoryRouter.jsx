// src/pages/admin/inventory/InventoryRouter.jsx
import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import AdminLayout from '../../../components/AdminLayout';
import StockMovements from './StockMovements';
import Items from './Items';
import Categories from './Categories';
import Suppliers from './Suppliers';

const InventoryLayout = () => (
  <AdminLayout>
    <div className="space-y-6">
      <Outlet />
    </div>
  </AdminLayout>
);

const InventoryRouter = () => (
  <Routes>
    <Route element={<InventoryLayout />}>
      <Route index element={<Navigate to="movements" replace />} />
      <Route path="movements" element={<StockMovements />} />
      <Route path="items" element={<Items />} />
      <Route path="categories" element={<Categories />} />
      <Route path="suppliers" element={<Suppliers />} />
    </Route>
  </Routes>
);

export default InventoryRouter;