// src/pages/admin/inventory/Categories.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchCategories, createCategory, updateCategory, deleteCategory } from './inventoryService';
import CategoryForm from './CategoryForm';
import AdminLayout from '../../../components/AdminLayout';
import { Layers, Plus, Pencil, Trash2, Package, ArrowLeft } from 'lucide-react';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const { data } = await fetchCategories();
    setCategories(data || []);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Xoá nhóm?')) return;
    await deleteCategory(id);
    await load();
  };

  return (
    <AdminLayout>
      <div className="page-shell">
        <div className="page-header">
          <div className="page-header-main">
            <div className="page-header-icon">
              <Layers className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <h2 className="page-header-title">Nhóm vật tư</h2>
              <p className="page-header-subtitle">Quản lý nhóm/danh mục để phân loại vật tư</p>
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
              Thêm nhóm
            </button>
          </div>
        </div>

        <div className="card-portal overflow-hidden p-0">
          <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Package className="h-4 w-4 text-primary" />
              Tất cả nhóm vật tư
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">{categories.length} nhóm</p>
          </div>

          {categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Layers className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-slate-600">Chưa có nhóm vật tư</p>
              <p className="mt-1 text-xs text-slate-500">Tạo nhóm để phân loại vật tư</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="table-head-row">
                <tr>
                  <th className="table-head-cell">Tên nhóm</th>
                  <th className="table-head-cell">Trạng thái</th>
                  <th className="table-head-cell text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map(c => (
                  <tr key={c.id} className="table-row">
                    <td className="table-cell font-medium text-slate-800">{c.name}</td>
                    <td className="table-cell">
                      {c.status ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                          {c.status}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex justify-end items-center gap-2">
                        <button
                          onClick={() => { setEditing(c); setShowForm(true); }}
                          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-200"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
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

        {showForm && <CategoryForm initialData={editing} onClose={() => { setShowForm(false); load(); }} />}
      </div>
    </AdminLayout>
  );
};

export default Categories;