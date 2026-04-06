// src/pages/admin/inventory/Suppliers.jsx
import React, { useEffect, useState } from 'react';
import { fetchSuppliers, deleteSupplier } from './inventoryService';
import SupplierForm from './SupplierForm';

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const { data } = await fetchSuppliers();
    setSuppliers(data || []);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Xoá nhà cung cấp?')) return;
    await deleteSupplier(id);
    await load();
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-bold">Nhà cung cấp</h2>
          <div className="text-sm text-gray-500">Quản lý danh sách nhà cung cấp vật tư</div>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary">Thêm nhà cung cấp</button>
      </header>

      <div className="card-portal overflow-x-auto">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="p-3">Nhà cung cấp</th>
              <th className="p-3">Người liên hệ</th>
              <th className="p-3">Điện thoại</th>
              <th className="p-3">Email</th>
              <th className="p-3">Ghi chú</th>
              <th className="p-3">Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {suppliers.map(s => (
              <tr key={s.id} className="border-t">
                <td className="p-3 font-medium text-gray-900">{s.name}</td>
                <td className="p-3">{s.contact_name || '—'}</td>
                <td className="p-3">{s.phone || '—'}</td>
                <td className="p-3">{s.email || '—'}</td>
                <td className="p-3">{s.note || '—'}</td>
                <td className="p-3 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <button onClick={() => { setEditing(s); setShowForm(true); }} className="font-medium text-blue-600 hover:text-blue-700">Sửa</button>
                    <button onClick={() => handleDelete(s.id)} className="font-medium text-red-600 hover:text-red-700">Xoá</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && <SupplierForm initialData={editing} onClose={() => { setShowForm(false); load(); }} />}
    </div>
  );
};

export default Suppliers;