// src/pages/admin/inventory/CategoryForm.jsx
import React, { useEffect, useState } from 'react';
import Modal from 'react-modal';
import { fetchCategories, createCategory, updateCategory } from './inventoryService';

Modal.setAppElement('#root');

const CategoryForm = ({ initialData = null, onClose, onSaved }) => {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ parent_id: '', name: '', status: 'active' });

  useEffect(() => {
    const load = async () => {
      const { data } = await fetchCategories();
      setCategories(data || []);
    };
    load();
    if (initialData) setForm({ parent_id: initialData.parent_id || '', name: initialData.name || '', status: initialData.status || 'active' });
  }, [initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) { alert('Tên nhóm là bắt buộc'); return; }
    try {
      if (initialData) {
        await updateCategory(initialData.id, form);
      } else {
        await createCategory(form);
      }
      onSaved?.();
      onClose?.();
    } catch (err) {
      console.error(err);
      alert('Lỗi lưu nhóm: ' + (err.message || JSON.stringify(err)));
    }
  };

  return (
    <Modal isOpen onRequestClose={onClose} className="bg-white rounded-xl w-full max-w-md mt-10 p-6" overlayClassName="fixed inset-0 bg-black/40 flex items-start justify-center p-4 z-50">
      <h3 className="text-lg font-semibold mb-4">{initialData ? 'Sửa nhóm' : 'Thêm nhóm'}</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm">Nhóm cha</label>
          <select className="input-portal" value={form.parent_id} onChange={e => setForm({ ...form, parent_id: e.target.value })}>
            <option value="">-- (không) --</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm">Tên nhóm</label>
          <input className="input-portal" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className="block text-sm">Trạng thái</label>
          <select className="input-portal" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
            <option value="active">Hoạt động</option>
            <option value="inactive">Ngừng</option>
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Hủy</button>
          <button type="submit" className="px-4 py-2 bg-primary text-white rounded">Lưu</button>
        </div>
      </form>
    </Modal>
  );
};

export default CategoryForm;