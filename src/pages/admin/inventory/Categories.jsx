// src/pages/admin/inventory/Categories.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchCategories, createCategory, updateCategory, deleteCategory } from './inventoryService';
import CategoryForm from './CategoryForm';

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
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-bold">Nhóm vật tư</h2>
          <div className="text-sm text-gray-500">Quản lý nhóm/danh mục để phân loại vật tư</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/admin/inventory/items" className="btn-secondary">Danh mục vật tư</Link>
          <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary">Thêm nhóm</button>
        </div>
      </header>

      <div className="card-portal overflow-x-auto">
        <table className="min-w-[700px] w-full text-sm">
          <thead className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="p-3">Tên</th>
              <th className="p-3">Trạng thái</th>
              <th className="p-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(c => (
              <tr key={c.id} className="border-t">
                <td className="p-3 font-medium text-gray-900">{c.name}</td>
                <td className="p-3">{c.status || '—'}</td>
                <td className="p-3 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <button onClick={() => { setEditing(c); setShowForm(true); }} className="font-medium text-blue-600 hover:text-blue-700">Sửa</button>
                    <button onClick={() => handleDelete(c.id)} className="font-medium text-red-600 hover:text-red-700">Xoá</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && <CategoryForm initialData={editing} onClose={() => { setShowForm(false); load(); }} />}
    </div>
  );
};

export default Categories;