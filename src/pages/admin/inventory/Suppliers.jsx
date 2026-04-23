// src/pages/admin/inventory/Suppliers.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchSuppliers, deleteSupplier } from './inventoryService';
import SupplierForm from './SupplierForm';
import AdminLayout from '../../../components/AdminLayout';
import { Truck, Plus, Pencil, Trash2, Package, ArrowLeft, Phone, Mail } from 'lucide-react';

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
    <AdminLayout>
      <div className="page-shell">
        <div className="page-header">
          <div className="page-header-main">
            <div className="page-header-icon">
              <Truck className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <h2 className="page-header-title">Nhà cung cấp</h2>
              <p className="page-header-subtitle">Quản lý danh sách nhà cung cấp vật tư</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/admin/inventory/items" className="btn-secondary inline-flex items-center gap-2 px-4">
              <ArrowLeft className="h-4 w-4" />
              Danh mục vật tư
            </Link>
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="btn-primary inline-flex items-center gap-2 px-4"
            >
              <Plus className="h-4 w-4" />
              Thêm nhà cung cấp
            </button>
          </div>
        </div>

        <div className="card-portal overflow-hidden p-0">
          <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Package className="h-4 w-4 text-primary" />
              Tất cả nhà cung cấp
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">{suppliers.length} nhà cung cấp</p>
          </div>

          {suppliers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Truck className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-slate-600">Chưa có nhà cung cấp</p>
              <p className="mt-1 text-xs text-slate-500">Thêm nhà cung cấp để quản lý vật tư</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="table-head-row">
                <tr>
                  <th className="table-head-cell">Nhà cung cấp</th>
                  <th className="table-head-cell">Người liên hệ</th>
                  <th className="table-head-cell">Điện thoại</th>
                  <th className="table-head-cell">Email</th>
                  <th className="table-head-cell">Ghi chú</th>
                  <th className="table-head-cell text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suppliers.map(s => (
                  <tr key={s.id} className="table-row">
                    <td className="table-cell font-medium text-slate-800">{s.name}</td>
                    <td className="table-cell text-slate-600">{s.contact_name || <span className="text-slate-400">—</span>}</td>
                    <td className="table-cell">
                      {s.phone ? (
                        <span className="inline-flex items-center gap-1.5 text-slate-600">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          {s.phone}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="table-cell">
                      {s.email ? (
                        <span className="inline-flex items-center gap-1.5 text-slate-600">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          {s.email}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="table-cell text-slate-500">{s.note || <span className="text-slate-400">—</span>}</td>
                    <td className="table-cell text-right">
                      <div className="flex justify-end items-center gap-2">
                        <button
                          onClick={() => { setEditing(s); setShowForm(true); }}
                          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-200"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-200"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Xoá
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {showForm && <SupplierForm initialData={editing} onClose={() => { setShowForm(false); load(); }} />}
      </div>
    </AdminLayout>
  );
};

export default Suppliers;