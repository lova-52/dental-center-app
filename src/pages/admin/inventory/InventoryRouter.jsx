// src/pages/admin/inventory/InventoryRouter.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import StockMovements from './StockMovements';
import Items from './Items';
import Categories from './Categories';
import Suppliers from './Suppliers';

const InventoryRouter = () => (
  <Routes>
    <Route index element={<Navigate to="movements" replace />} />
    <Route path="movements" element={<StockMovements />} />
    <Route path="items" element={<Items />} />
    <Route path="categories" element={<Categories />} />
    <Route path="suppliers" element={<Suppliers />} />
  </Routes>
);

export default InventoryRouter;